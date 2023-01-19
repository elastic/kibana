/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import pMap from 'p-map';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import intersection from 'lodash/intersection';

import type { Logger } from '@kbn/logging';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import type {
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
} from '@kbn/core-saved-objects-api-server';
import {
  type ISavedObjectsSecurityExtension,
  type ISavedObjectTypeRegistry,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers, type DecoratedError } from '@kbn/core-saved-objects-common';
import type {
  IndexMapping,
  SavedObjectsSerializer,
} from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObject } from '@kbn/core-saved-objects-common';
import { AuthorizeObject } from '@kbn/core-saved-objects-server/src/extensions/security';
import {
  getBulkOperationError,
  getExpectedVersionProperties,
  rawDocExistsInNamespace,
  type Either,
  isLeft,
  isRight,
} from './internal_utils';
import { DEFAULT_REFRESH_SETTING } from './repository';
import type { RepositoryEsClient } from './repository_es_client';
import type { DeleteLegacyUrlAliasesParams } from './legacy_url_aliases';
import { deleteLegacyUrlAliases } from './legacy_url_aliases';

/**
 * Parameters for the updateObjectsSpaces function.
 *
 * @internal
 */
export interface UpdateObjectsSpacesParams {
  mappings: IndexMapping;
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  logger: Logger;
  getIndexForType: (type: string) => string;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  objects: SavedObjectsUpdateObjectsSpacesObject[];
  spacesToAdd: string[];
  spacesToRemove: string[];
  options?: SavedObjectsUpdateObjectsSpacesOptions;
}

type ObjectToDeleteAliasesFor = Pick<
  DeleteLegacyUrlAliasesParams,
  'type' | 'id' | 'namespaces' | 'deleteBehavior'
>;

const MAX_CONCURRENT_ALIAS_DELETIONS = 10;

function isMgetError(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.MgetMultiGetError {
  return Boolean(doc && 'error' in doc);
}

/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 */
export async function updateObjectsSpaces({
  mappings,
  registry,
  allowedTypes,
  client,
  serializer,
  logger,
  getIndexForType,
  securityExtension,
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
    Either<
      SavedObjectsUpdateObjectsSpacesResponseObject,
      { type: string; id: string; version: string | undefined; esRequestIndex: number }
    >
  > = objects.map((object) => {
    const { type, id, version } = object;

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
        version,
        esRequestIndex: bulkGetRequestIndexCounter++,
      },
    };
  });

  const validObjects = expectedBulkGetResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    return {
      // Filter with the `isLeft` comparator simply because it's a convenient type guard, we know the only expected results are errors.
      objects: expectedBulkGetResults.filter(isLeft).map(({ value }) => value),
    };
  }

  const bulkGetDocs = validObjects.map<estypes.MgetOperation>((x) => ({
    _id: serializer.generateRawId(undefined, x.value.type, x.value.id),
    _index: getIndexForType(x.value.type),
    _source: ['type', 'namespaces'],
  }));
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: bulkGetDocs } },
        { ignore: [404], meta: true }
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

  const authObjects: AuthorizeObject[] = validObjects.map((element) => {
    const { type, id, esRequestIndex: index } = element.value;
    const preflightResult = index !== undefined ? bulkGetResponse?.body.docs[index] : undefined;
    return {
      type,
      id,
      // @ts-expect-error MultiGetHit._source is optional
      existingNamespaces: preflightResult?._source?.namespaces,
    };
  });

  // If a user tries to share/unshare an object to/from '*', they need to have 'share_to_space' privileges for the Global Resource (e.g.,
  // All privileges for All Spaces).
  const authorizationResult = await securityExtension?.authorizeUpdateSpaces({
    namespace,
    spacesToAdd,
    spacesToRemove,
    objects: authObjects,
  });

  const time = new Date().toISOString();
  let bulkOperationRequestIndexCounter = 0;
  const bulkOperationParams: estypes.BulkOperationContainer[] = [];
  const objectsToDeleteAliasesFor: ObjectToDeleteAliasesFor[] = [];
  const expectedBulkOperationResults: Array<
    Either<
      SavedObjectsUpdateObjectsSpacesResponseObject,
      { type: string; id: string; updatedSpaces: string[]; esRequestIndex?: number }
    >
  > = expectedBulkGetResults.map((expectedBulkGetResult) => {
    if (isLeft(expectedBulkGetResult)) {
      return expectedBulkGetResult;
    }

    const { id, type, version, esRequestIndex } = expectedBulkGetResult.value;
    const doc = bulkGetResponse!.body.docs[esRequestIndex];
    if (
      isMgetError(doc) ||
      !doc?.found ||
      // @ts-expect-error MultiGetHit._source is optional
      !rawDocExistsInNamespace(registry, doc, namespace)
    ) {
      const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
      return {
        tag: 'Left',
        value: { id, type, spaces: [], error },
      };
    }

    const currentSpaces = doc._source?.namespaces ?? [];
    // @ts-expect-error MultiGetHit._source is optional
    const versionProperties = getExpectedVersionProperties(version, doc);

    const { updatedSpaces, removedSpaces, isUpdateRequired } = analyzeSpaceChanges(
      currentSpaces,
      spacesToAdd,
      spacesToRemove
    );
    const expectedResult = {
      type,
      id,
      updatedSpaces,
      ...(isUpdateRequired && { esRequestIndex: bulkOperationRequestIndexCounter++ }),
    };

    if (isUpdateRequired) {
      const documentMetadata = {
        _id: serializer.generateRawId(undefined, type, id),
        _index: getIndexForType(type),
        ...versionProperties,
      };
      if (updatedSpaces.length) {
        const documentToSave = { updated_at: time, namespaces: updatedSpaces };
        // @ts-expect-error BulkOperation.retry_on_conflict, BulkOperation.routing. BulkOperation.version, and BulkOperation.version_type are optional
        bulkOperationParams.push({ update: documentMetadata }, { doc: documentToSave });
      } else {
        bulkOperationParams.push({ delete: documentMetadata });
      }

      if (removedSpaces.length && !updatedSpaces.includes(ALL_NAMESPACES_STRING)) {
        // The object is being removed from at least one space; make sure to delete aliases appropriately
        objectsToDeleteAliasesFor.push({
          type,
          id,
          ...(removedSpaces.includes(ALL_NAMESPACES_STRING)
            ? { namespaces: updatedSpaces, deleteBehavior: 'exclusive' }
            : { namespaces: removedSpaces, deleteBehavior: 'inclusive' }),
        });
      }
    }

    return { tag: 'Right', value: expectedResult };
  });

  const { refresh = DEFAULT_REFRESH_SETTING } = options;
  const bulkOperationResponse = bulkOperationParams.length
    ? await client.bulk({ refresh, body: bulkOperationParams, require_alias: true })
    : undefined;

  // Delete aliases if necessary, ensuring we don't have too many concurrent operations running.
  const mapper = async ({ type, id, namespaces, deleteBehavior }: ObjectToDeleteAliasesFor) =>
    deleteLegacyUrlAliases({
      mappings,
      registry,
      client,
      getIndexForType,
      type,
      id,
      namespaces,
      deleteBehavior,
    }).catch((err) => {
      // The object has already been unshared, but we caught an error when attempting to delete aliases.
      // A consumer cannot attempt to unshare the object again, so just log the error and swallow it.
      logger.error(`Unable to delete aliases when unsharing an object: ${err.message}`);
    });
  await pMap(objectsToDeleteAliasesFor, mapper, { concurrency: MAX_CONCURRENT_ALIAS_DELETIONS });

  return {
    objects: expectedBulkOperationResults.map<SavedObjectsUpdateObjectsSpacesResponseObject>(
      (expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value;
        }

        const { type, id, updatedSpaces, esRequestIndex } = expectedResult.value;
        if (esRequestIndex !== undefined) {
          const response = bulkOperationResponse?.items[esRequestIndex] ?? {};
          const rawResponse = Object.values(response)[0] as any;
          const error = getBulkOperationError(type, id, rawResponse);
          if (error) {
            return { id, type, spaces: [], error };
          }
        }

        if (authorizationResult) {
          const { namespaces: redactedSpaces } = securityExtension!.redactNamespaces({
            savedObject: { type, namespaces: updatedSpaces } as SavedObject, // Other SavedObject attributes aren't required
            typeMap: authorizationResult.typeMap,
          });
          return { id, type, spaces: redactedSpaces! };
        }
        return { id, type, spaces: updatedSpaces };
      }
    ),
  };
}

/** Extracts the contents of a decorated error to return the attributes for bulk operations. */
function errorContent(error: DecoratedError) {
  return error.output.payload;
}

/** Gets the remaining spaces for an object after adding new ones and removing old ones. */
function analyzeSpaceChanges(
  existingSpaces: string[],
  spacesToAdd: string[],
  spacesToRemove: string[]
) {
  const addSet = new Set(spacesToAdd);
  const removeSet = new Set(spacesToRemove);
  const removedSpaces: string[] = [];
  const updatedSpaces = existingSpaces
    .filter((x) => {
      addSet.delete(x);
      const removed = removeSet.delete(x);
      if (removed) {
        removedSpaces.push(x);
      }
      return !removed;
    })
    .concat(Array.from(addSet));

  const isAnySpaceAdded = addSet.size > 0;
  const isAnySpaceRemoved = removeSet.size < spacesToRemove.length;
  const isUpdateRequired = isAnySpaceAdded || isAnySpaceRemoved;

  return { updatedSpaces, removedSpaces, isUpdateRequired };
}
