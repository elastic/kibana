/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsRawDocSource, SavedObjectsSerializer } from '../../serialization';
import type { MutatingOperationRefreshSetting, SavedObjectError } from '../../types';
import type {
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from './collect_multi_namespace_references';
import type { DecoratedError } from './errors';
import { SavedObjectsErrorHelpers } from './errors';
import { getBulkOperationError, getExpectedVersionProperties } from './internal_utils';
import { DEFAULT_REFRESH_SETTING } from './repository';
import type { RepositoryEsClient } from './repository_es_client';

/**
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesObject {
  /** The type of the object to update */
  id: string;
  /** The ID of the object to update */
  type: string;
  /** The space(s) that the object to update exists in
   *
   * @internal
   */
  spaces?: string[];
  /** The version of the object to update; this is used for optimistic concurency control
   *
   * @internal
   */
  version?: string;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesOptions {
  /** Whether or not to include references when sharing the objects */
  includeReferences?: boolean;
  /** The Elasticsearch Refresh setting for this operation */
  refresh?: MutatingOperationRefreshSetting;
}

/**
 *
 * @public
 */
export interface SavedObjectsUpdateObjectsSpacesResponse {
  objects: SavedObjectsUpdateObjectsSpacesResponseObject[];
}

/**
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

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Left = { tag: 'Left'; error: SavedObjectsUpdateObjectsSpacesResponseObject };
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type Right = { tag: 'Right'; value: Record<string, any> };
type Either = Left | Right;
const isLeft = (either: Either): either is Left => either.tag === 'Left';
const isRight = (either: Either): either is Right => either.tag === 'Right';

export interface UpdateObjectsSpacesParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: SavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  collectMultiNamespaceReferences: (
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[]
  ) => Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
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
  collectMultiNamespaceReferences,
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
  if (doArraysIntersect(spacesToAdd, spacesToRemove)) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'spacesToAdd and spacesToRemove cannot contain any of the same strings'
    );
  }

  const { includeReferences } = options;
  const expandedObjects: Array<
    SavedObjectsUpdateObjectsSpacesObject & { isMissing?: boolean }
  > = includeReferences ? (await collectMultiNamespaceReferences(objects)).objects : objects;

  let bulkGetRequestIndexCounter = 0;
  const expectedBulkGetResults: Either[] = expandedObjects.map((object) => {
    const { type, id, spaces, version, isMissing } = object;

    if (!allowedTypes.includes(type)) {
      const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
      return {
        tag: 'Left' as 'Left',
        error: { id, type, spaces: [], error },
      };
    }
    if (!registry.isShareable(type)) {
      const error = errorContent(
        SavedObjectsErrorHelpers.createBadRequestError(
          `${type} doesn't support multiple namespaces`
        )
      );
      return {
        tag: 'Left' as 'Left',
        error: { id, type, spaces: [], error },
      };
    }
    if (isMissing) {
      const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
      return {
        tag: 'Left' as 'Left',
        error: { id, type, spaces: [], error },
      };
    }

    return {
      tag: 'Right' as 'Right',
      value: {
        type,
        id,
        spaces,
        version,
        ...(!spaces && { esRequestIndex: bulkGetRequestIndexCounter++ }),
      },
    };
  });

  const bulkGetDocs = expectedBulkGetResults
    .filter(isRight)
    .filter(({ value }) => value.esRequestIndex !== undefined)
    .map(({ value: { type, id } }) => ({
      _id: serializer.generateRawId(undefined, type, id),
      _index: getIndexForType(type),
      _source: ['type', 'namespaces'],
    }));
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: bulkGetDocs } },
        { ignore: [404] }
      )
    : undefined;

  const time = new Date().toISOString();
  let bulkOperationRequestIndexCounter = 0;
  const bulkOperationParams: object[] = [];
  const expectedBulkOperationResults: Either[] = expectedBulkGetResults.map(
    (expectedBulkGetResult) => {
      if (isLeft(expectedBulkGetResult)) {
        return expectedBulkGetResult;
      }

      const { id, type, spaces, version, esRequestIndex } = expectedBulkGetResult.value;

      let currentSpaces: string[] = spaces;
      let versionProperties;
      if (esRequestIndex !== undefined) {
        const doc = bulkGetResponse?.body.docs[esRequestIndex];
        if (!doc?.found) {
          const error = errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id));
          return {
            tag: 'Left' as 'Left',
            error: { id, type, spaces: [], error },
          };
        }
        currentSpaces = doc._source?.namespaces ?? [];
        // @ts-expect-error MultiGetHit._source is optional
        versionProperties = getExpectedVersionProperties(version, doc);
      } else {
        versionProperties = getExpectedVersionProperties(version);
      }

      const { remainingSpaces, skip } = getRemainingSpaces(
        currentSpaces,
        spacesToAdd,
        spacesToRemove
      );
      const expectedResult = {
        type,
        id,
        remainingSpaces,
        ...(!skip && { esRequestIndex: bulkOperationRequestIndexCounter++ }),
      };

      if (!skip) {
        const documentMetadata = {
          _id: serializer.generateRawId(undefined, type, id),
          _index: getIndexForType(type),
          ...versionProperties,
        };
        if (remainingSpaces.length) {
          const documentToSave = { updated_at: time, namespaces: remainingSpaces };
          bulkOperationParams.push({ update: documentMetadata }, { doc: documentToSave });
        } else {
          bulkOperationParams.push({ delete: documentMetadata });
        }
      }

      return { tag: 'Right' as 'Right', value: expectedResult };
    }
  );

  const { refresh = DEFAULT_REFRESH_SETTING } = options;
  const bulkOperationResponse = bulkOperationParams.length
    ? await client.bulk({ refresh, body: bulkOperationParams, require_alias: true })
    : undefined;

  return {
    objects: expectedBulkOperationResults.map<SavedObjectsUpdateObjectsSpacesResponseObject>(
      (expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.error;
        }

        const { type, id, remainingSpaces, esRequestIndex } = expectedResult.value;
        if (esRequestIndex !== undefined) {
          const response = bulkOperationResponse?.body.items[esRequestIndex] ?? {};
          const rawResponse = Object.values(response)[0] as any;
          const error = getBulkOperationError(type, id, rawResponse);
          if (error) {
            return { id, type, spaces: [], error };
          }
        }

        return { id, type, spaces: remainingSpaces };
      }
    ),
  };
}

/** Extracts the contents of a decorated error to return the attributes for bulk operations. */
function errorContent(error: DecoratedError) {
  return error.output.payload;
}

/** Determines whether or not two arrays have any elements that intersect. */
function doArraysIntersect<T>(a: T[], b: T[]) {
  const aSet = new Set(a);
  for (const x of b) {
    if (aSet.has(x)) {
      return true;
    }
  }
  return false;
}

/** Gets the remaining spaces for an object after adding new ones and removing old ones. */
function getRemainingSpaces(
  existingSpaces: string[],
  spacesToAdd: string[],
  spacesToRemove: string[]
) {
  const addSet = new Set(spacesToAdd);
  const removeSet = new Set(spacesToRemove);
  const remainingSpaces = existingSpaces
    .filter((x) => {
      addSet.delete(x);
      return !removeSet.delete(x);
    })
    .concat(Array.from(addSet));

  const isAnySpaceAdded = addSet.size > 0;
  const isAnySpaceRemoved = removeSet.size < spacesToRemove.length;
  const skip = remainingSpaces.length && !isAnySpaceAdded && !isAnySpaceRemoved;

  return { remainingSpaces, skip };
}
