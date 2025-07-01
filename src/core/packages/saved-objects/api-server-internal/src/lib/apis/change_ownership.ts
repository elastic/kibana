/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type {
  SavedObjectsChangeOwnershipObject,
  SavedObjectsChangeOwnershipOptions,
  SavedObjectsChangeOwnershipResponse,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSecurityExtension,
  ISavedObjectsSerializer,
  SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import {
  getBulkOperationError,
  getExpectedVersionProperties,
  rawDocExistsInNamespace,
  type Either,
  isLeft,
  isRight,
  left,
  right,
} from './utils';
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
  objects: SavedObjectsChangeOwnershipObject[];
  options: SavedObjectsChangeOwnershipOptions<T> & { namespace?: string };
  securityExtension?: ISavedObjectsSecurityExtension;
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
    objects,
    options: { ...options, namespace },
    securityExtension,
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
    objects,
    securityExtension,
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

  let bulkGetRequestIndexCounter = 0;
  const expectedBulkGetResults: Array<
    Either<
      { id: string; type: string; error: any },
      { type: string; id: string; esRequestIndex: number }
    >
  > = objects.map((object) => {
    const { type, id } = object;

    if (!allowedTypes.includes(type)) {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      return left({ id, type, error });
    }
    if (!registry.supportsAccessControl(type)) {
      const error = SavedObjectsErrorHelpers.createBadRequestError(
        `The type "${type}" does not support access control.`
      );
      return left({ id, type, error });
    }

    return right({
      type,
      id,
      esRequestIndex: bulkGetRequestIndexCounter++,
    });
  });

  const validObjects = expectedBulkGetResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    return {
      objects: expectedBulkGetResults.filter(isLeft).map(({ value }) => value),
    } as unknown as SavedObjectsChangeOwnershipResponse<T>;
  }

  const bulkGetDocs = validObjects.map<estypes.MgetOperation>((x) => ({
    _id: serializer.generateRawId(undefined, x.value.type, x.value.id),
    _index: getIndexForType(x.value.type),
    _source: ['type', 'namespaces', 'accessControl'],
  }));

  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { docs: bulkGetDocs },
        { ignore: [404], meta: true }
      )
    : undefined;

  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }
  const authObjects = validObjects.map((element) => {
    const { type, id, esRequestIndex: index } = element.value;
    const preflightResult = index !== undefined ? bulkGetResponse?.body.docs[index] : undefined;
    return {
      type,
      id,
      // @ts-expect-error MultiGetHit._source is optional
      existingNamespaces: preflightResult?._source?.namespaces ?? [],
      // @ts-expect-error MultiGetHit._source is optional
      accessControl: preflightResult?._source?.accessControl ?? {},
    };
  });

  const authorizationResult = await securityExtension?.authorizeChangeOwnership({
    namespace,
    objects: authObjects,
  });

  const time = new Date().toISOString();
  let bulkOperationRequestIndexCounter = 0;
  const bulkOperationParams: estypes.BulkOperationContainer[] = [];
  const expectedBulkOperationResults: Array<
    Either<
      { id: string; type: string; error: any },
      { type: string; id: string; esRequestIndex?: number }
    >
  > = expectedBulkGetResults.map((expectedBulkGetResult) => {
    if (isLeft(expectedBulkGetResult)) {
      return expectedBulkGetResult;
    }

    const { id, type, esRequestIndex } = expectedBulkGetResult.value;
    const doc = bulkGetResponse!.body.docs[esRequestIndex];
    if (
      isMgetError(doc) ||
      !doc?.found ||
      // @ts-expect-error MultiGetHit._source is optional
      !rawDocExistsInNamespace(registry, doc, namespace)
    ) {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      return left({ id, type, error });
    }
    if (authorizationResult?.status === 'unauthorized') {
      const error = SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(`User is not authorized to change ownership of type "${type}".`)
      );
      return left({ id, type, error });
    }

    const currentSource = doc._source;
    // @ts-expect-error MultiGetHit._source is optional
    const versionProperties = getExpectedVersionProperties(undefined, doc);

    const expectedResult = {
      type,
      id,
      esRequestIndex: bulkOperationRequestIndexCounter++,
    };

    const documentMetadata = {
      _id: serializer.generateRawId(undefined, type, id),
      _index: getIndexForType(type),
      ...versionProperties,
    };

    const documentToSave = {
      updated_at: time,
      updated_by: owner,
      accessControl: {
        ...(currentSource?.accessControl || {}),
        owner,
      },
    };

    // @ts-expect-error BulkOperation.retry_on_conflict, BulkOperation.routing. BulkOperation.version, and BulkOperation.version_type are optional
    bulkOperationParams.push({ update: documentMetadata }, { doc: documentToSave });

    return right(expectedResult);
  });

  const bulkOperationResponse = bulkOperationParams.length
    ? await client.bulk({
        refresh: 'wait_for',
        operations: bulkOperationParams,
        require_alias: true,
      })
    : undefined;

  return {
    objects: expectedBulkOperationResults.map<{ id: string; type: string; error?: any }>(
      (expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value;
        }

        const { type, id, esRequestIndex } = expectedResult.value;
        if (esRequestIndex !== undefined) {
          const response = bulkOperationResponse?.items[esRequestIndex] ?? {};
          const rawResponse = Object.values(response)[0] as any;
          const error = getBulkOperationError(type, id, rawResponse);
          if (error) {
            return { id, type, error };
          }
        }

        return { id, type };
      }
    ),
  } as unknown as SavedObjectsChangeOwnershipResponse<T>;
};

function isMgetError(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.MgetMultiGetError {
  return Boolean(doc && 'error' in doc);
}
