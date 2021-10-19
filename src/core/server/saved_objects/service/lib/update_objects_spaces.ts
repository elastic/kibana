/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import intersection from 'lodash/intersection';

import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsRawDocSource, SavedObjectsSerializer } from '../../serialization';
import type {
  MutatingOperationRefreshSetting,
  SavedObjectError,
  SavedObjectsBaseOptions,
} from '../../types';
import type { DecoratedError } from './errors';
import { SavedObjectsErrorHelpers } from './errors';
import {
  getBulkOperationError,
  getExpectedVersionProperties,
  rawDocExistsInNamespace,
  Either,
  isLeft,
  isRight,
} from './internal_utils';
import { DEFAULT_REFRESH_SETTING } from './repository';
import type { RepositoryEsClient } from './repository_es_client';
import { isNotFoundFromUnsupportedServer } from '../../../elasticsearch';

/**
 * An object that should have its spaces updated.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesObject {
  /** The type of the object to update */
  id: string;
  /** The ID of the object to update */
  type: string;
  /**
   * The space(s) that the object to update currently exists in. This is only intended to be used by SOC wrappers.
   *
   * @internal
   */
  spaces?: string[];
  /**
   * The version of the object to update; this is used for optimistic concurrency control. This is only intended to be used by SOC wrappers.
   *
   * @internal
   */
  version?: string;
}

/**
 * Options for the update operation.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesOptions extends SavedObjectsBaseOptions {
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 * The response when objects' spaces are updated.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesResponse {
  objects: SavedObjectsUpdateObjectsSpacesResponseObject[];
}

/**
 * Details about a specific object's update result.
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesResponseObject {
  /** The type of the referenced object */
  type: string;
  /** The ID of the referenced object */
  id: string;
  /** The space(s) that the referenced object exists in */
  spaces: string[];
  /** Included if there was an error updating this object's spaces */
  error?: SavedObjectError;
}

/**
 * Parameters for the updateObjectsSpaces function.
 *
 * @internal
 */
export interface UpdateObjectsSpacesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  objects: SavedObjectsUpdateObjectsSpacesObject[];
  spacesToAdd: string[];
  spacesToRemove: string[];
  options?: SavedObjectsUpdateObjectsSpacesOptions;
}

/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 */
export async function updateObjectsSpaces({
  registry,
  allowedTypes,
  client,
  serializer,
  getIndexForType,
  objects,
  spacesToAdd,
  spacesToRemove,
  options = {},
}: UpdateObjectsSpacesParams): Promise<SavedObjectsUpdateObjectsSpacesResponse> {
  if (!spacesToAdd.length && !spacesToRemove.length) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'spacesToAdd and/or spacesToRemove must be a non-empty array of strings'
    );
  }
  if (intersection(spacesToAdd, spacesToRemove).length > 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'spacesToAdd and spacesToRemove cannot contain any of the same strings'
    );
  }

  const { namespace } = options;

  let bulkGetRequestIndexCounter = 0;
  const expectedBulkGetResults: Array<
    Either<SavedObjectsUpdateObjectsSpacesResponseObject, Record<string, any>>
  > = objects.map((object) => {
    const { type, id, spaces, version } = object;

    if (!allowedTypes.includes(type)) {
      const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
      return {
        tag: 'Left',
        value: { id, type, spaces: [], error },
      };
    }
    if (!registry.isShareable(type)) {
      const error = errorContent(
        SavedObjectsErrorHelpers.createBadRequestError(
          `${type} doesn't support multiple namespaces`
        )
      );
      return {
        tag: 'Left',
        value: { id, type, spaces: [], error },
      };
    }

    return {
      tag: 'Right',
      value: {
        type,
        id,
        spaces,
        version,
        ...(!spaces && { esRequestIndex: bulkGetRequestIndexCounter++ }),
      },
    };
  });

  const bulkGetDocs = expectedBulkGetResults.reduce<estypes.MgetOperation[]>((acc, x) => {
    if (isRight(x) && x.value.esRequestIndex !== undefined) {
      acc.push({
        _id: serializer.generateRawId(undefined, x.value.type, x.value.id),
        _index: getIndexForType(x.value.type),
        _source: ['type', 'namespaces'],
      });
    }
    return acc;
  }, []);
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: bulkGetDocs } },
        { ignore: [404] }
      )
    : undefined;

  // fail fast if we can't verify a 404 response is from Elasticsearch
  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }
  const time = new Date().toISOString();
  let bulkOperationRequestIndexCounter = 0;
  const bulkOperationParams: estypes.BulkOperationContainer[] = [];
  const expectedBulkOperationResults: Array<
    Either<SavedObjectsUpdateObjectsSpacesResponseObject, Record<string, any>>
  > = expectedBulkGetResults.map((expectedBulkGetResult) => {
    if (isLeft(expectedBulkGetResult)) {
      return expectedBulkGetResult;
    }

    const { id, type, spaces, version, esRequestIndex } = expectedBulkGetResult.value;

    let currentSpaces: string[] = spaces;
    let versionProperties;
    if (esRequestIndex !== undefined) {
      const doc = bulkGetResponse?.body.docs[esRequestIndex];
      // @ts-expect-error MultiGetHit._source is optional
      if (!doc?.found || !rawDocExistsInNamespace(registry, doc, namespace)) {
        const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
        return {
          tag: 'Left',
          value: { id, type, spaces: [], error },
        };
      }
      currentSpaces = doc._source?.namespaces ?? [];
      // @ts-expect-error MultiGetHit._source is optional
      versionProperties = getExpectedVersionProperties(version, doc);
    } else if (spaces?.length === 0) {
      // A SOC wrapper attempted to retrieve this object in a pre-flight request and it was not found.
      const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
      return {
        tag: 'Left',
        value: { id, type, spaces: [], error },
      };
    } else {
      versionProperties = getExpectedVersionProperties(version);
    }

    const { newSpaces, isUpdateRequired } = getNewSpacesArray(
      currentSpaces,
      spacesToAdd,
      spacesToRemove
    );
    const expectedResult = {
      type,
      id,
      newSpaces,
      ...(isUpdateRequired && { esRequestIndex: bulkOperationRequestIndexCounter++ }),
    };

    if (isUpdateRequired) {
      const documentMetadata = {
        _id: serializer.generateRawId(undefined, type, id),
        _index: getIndexForType(type),
        ...versionProperties,
      };
      if (newSpaces.length) {
        const documentToSave = { updated_at: time, namespaces: newSpaces };
        // @ts-expect-error BulkOperation.retry_on_conflict, BulkOperation.routing. BulkOperation.version, and BulkOperation.version_type are optional
        bulkOperationParams.push({ update: documentMetadata }, { doc: documentToSave });
      } else {
        // @ts-expect-error BulkOperation.retry_on_conflict, BulkOperation.routing. BulkOperation.version, and BulkOperation.version_type are optional
        bulkOperationParams.push({ delete: documentMetadata });
      }
    }

    return { tag: 'Right', value: expectedResult };
  });

  const { refresh = DEFAULT_REFRESH_SETTING } = options;
  const bulkOperationResponse = bulkOperationParams.length
    ? await client.bulk({ refresh, body: bulkOperationParams, require_alias: true })
    : undefined;

  return {
    objects: expectedBulkOperationResults.map<SavedObjectsUpdateObjectsSpacesResponseObject>(
      (expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value;
        }

        const { type, id, newSpaces, esRequestIndex } = expectedResult.value;
        if (esRequestIndex !== undefined) {
          const response = bulkOperationResponse?.body.items[esRequestIndex] ?? {};
          const rawResponse = Object.values(response)[0] as any;
          const error = getBulkOperationError(type, id, rawResponse);
          if (error) {
            return { id, type, spaces: [], error };
          }
        }

        return { id, type, spaces: newSpaces };
      }
    ),
  };
}

/** Extracts the contents of a decorated error to return the attributes for bulk operations. */
function errorContent(error: DecoratedError) {
  return error.output.payload;
}

/** Gets the remaining spaces for an object after adding new ones and removing old ones. */
function getNewSpacesArray(
  existingSpaces: string[],
  spacesToAdd: string[],
  spacesToRemove: string[]
) {
  const addSet = new Set(spacesToAdd);
  const removeSet = new Set(spacesToRemove);
  const newSpaces = existingSpaces
    .filter((x) => {
      addSet.delete(x);
      return !removeSet.delete(x);
    })
    .concat(Array.from(addSet));

  const isAnySpaceAdded = addSet.size > 0;
  const isAnySpaceRemoved = removeSet.size < spacesToRemove.length;
  const isUpdateRequired = isAnySpaceAdded || isAnySpaceRemoved;

  return { newSpaces, isUpdateRequired };
}
