/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsChangeOwnershipObject,
  SavedObjectsChangeOwnershipOptions,
  SavedObjectsChangeOwnershipResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
  ISavedObjectsSecurityExtension,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import type { ApiExecutionContext } from './types';

export interface PerformChangeOwnershipParams<T = unknown> {
  objects: SavedObjectsChangeOwnershipObject[];
  options: SavedObjectsChangeOwnershipOptions<T>;
}

interface ChangeObjectOwnershipParams<T = unknown> {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: ApiExecutionContext['client'];
  serializer: ISavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  securityExtension?: ISavedObjectsSecurityExtension;
  objects: SavedObjectsChangeOwnershipObject[];
  options: SavedObjectsChangeOwnershipOptions<T> & { namespace?: string };
}

export const performChangeOwnership = async <T>(
  { objects, options }: PerformChangeOwnershipParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsChangeOwnershipResponse<T>> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  return updateObjectOwnership({
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    securityExtension,
    objects,
    options: { ...options, namespace },
  });
};

export const updateObjectOwnership = async <T>(
  params: ChangeObjectOwnershipParams<T>
): Promise<SavedObjectsChangeOwnershipResponse<T>> => {
  const { owner, namespace } = params.options;
  const {
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType,
    securityExtension,
    objects,
  } = params;

  if (!owner) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'The "owner" field is required to change ownership of a saved object.'
    );
  }

  if (!objects || objects.length === 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'No objects specified for ownership change'
    );
  }

  // Validate objects and prepare for bulk get
  let bulkGetRequestIndexCounter = 0;
  const validObjects: Array<{ type: string; id: string; esRequestIndex: number }> = [];
  const errorResults: Array<{ id: string; type: string; error: any }> = [];

  // First check if all objects are valid types and support access control
  objects.forEach((object) => {
    const { type, id } = object;

    if (!allowedTypes.includes(type)) {
      errorResults.push({
        id,
        type,
        error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
      });
      return;
    }

    if (!registry.supportsAccessControl(type)) {
      errorResults.push({
        id,
        type,
        error: SavedObjectsErrorHelpers.createBadRequestError(
          `${type} doesn't support access control`
        ).output.payload,
      });
      return;
    }

    validObjects.push({
      type,
      id,
      esRequestIndex: bulkGetRequestIndexCounter++,
    });
  });

  if (validObjects.length === 0) {
    return { objects: errorResults } as unknown as SavedObjectsChangeOwnershipResponse<T>;
  }

  const bulkGetDocs = validObjects.map(({ type, id }) => ({
    _id: serializer.generateRawId(undefined, type, id),
    _index: getIndexForType(type),
  }));

  try {
    // Get all objects at once
    const bulkGetResponse = await client.mget<SavedObjectsRawDocSource>(
      { docs: bulkGetDocs },
      { ignore: [404] }
    );

    const time = new Date().toISOString();
    const bulkOperationParams: any[] = [];
    const results: Array<{ id: string; type: string; error?: any }> = [];

    // Process each valid object
    for (let i = 0; i < validObjects.length; i++) {
      const { type, id, esRequestIndex } = validObjects[i];
      const doc = bulkGetResponse.docs?.[esRequestIndex];

      // Check if document was found
      if (!doc || !('_source' in doc) || !doc._source) {
        results.push({
          id,
          type,
          error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload,
        });
        continue;
      }

      const existingSource = doc._source;
      const existingNamespaces = existingSource.namespaces || [];

      // Check authorization if security extension is available
      if (securityExtension) {
        const authorizationResult = await securityExtension.authorizeChangeOwnership({
          namespace,
          object: {
            type,
            id,
            accessControl: existingSource.accessControl,
            existingNamespaces,
          },
        });

        if (authorizationResult?.status === 'unauthorized') {
          results.push({
            id,
            type,
            error: SavedObjectsErrorHelpers.decorateNotAuthorizedError(
              new Error('Unauthorized to change ownership of this object.')
            ).output.payload,
          });
          continue;
        }
      }

      // Prepare document update - change ownership
      const documentToSave = {
        updated_at: time,
        updated_by: owner,
        accessControl: {
          ...(existingSource.accessControl || {}),
          owner,
        },
      };

      // Add to bulk update operations
      const rawId = serializer.generateRawId(undefined, type, id);
      const index = getIndexForType(type);

      bulkOperationParams.push({ update: { _id: rawId, _index: index } }, { doc: documentToSave });

      // Add to results
      results.push({ id, type });
    }

    if (bulkOperationParams.length > 0) {
      // Execute bulk update operation
      const bulkResponse = await client.bulk({
        operations: bulkOperationParams,
        refresh: DEFAULT_REFRESH_SETTING,
      });

      // Process results with any errors from the bulk operation
      if (bulkResponse?.items) {
        for (let i = 0; i < bulkResponse.items.length; i += 2) {
          const responseItem = bulkResponse.items[i];
          const updateResponse = responseItem.update;

          if (updateResponse?.error) {
            const resultIndex = i / 2;
            if (resultIndex < results.length && !results[resultIndex].error) {
              results[resultIndex].error = {
                message: updateResponse.error.reason || 'Unknown error during bulk update',
                statusCode: updateResponse.status || 500,
              };
            }
          }
        }
      }
    }

    // Combine results with initial errors
    const allResults = [...errorResults, ...results];

    return { objects: allResults } as unknown as SavedObjectsChangeOwnershipResponse<T>;
  } catch (error: any) {
    throw error;
  }
};
