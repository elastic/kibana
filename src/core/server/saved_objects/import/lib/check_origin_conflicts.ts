/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import pMap from 'p-map';
import { v4 as uuidv4 } from 'uuid';
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
} from '../../types';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { getObjectKey } from '../../service/lib/internal_utils';
import type { ImportStateMap } from './types';
import { createOriginQuery } from './utils';

interface CheckOriginConflictsParams {
  objects: Array<SavedObject<{ title?: string }>>;
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
  ignoreRegularConflicts?: boolean;
  importStateMap: ImportStateMap;
  pendingOverwrites: Set<string>;
  retries?: SavedObjectsImportRetry[];
}

type CheckOriginConflictParams = Omit<
  CheckOriginConflictsParams,
  'objects' | 'importIdMap' | 'retries'
> & {
  object: SavedObject<{ title?: string }>;
  objectIdsBeingImported: Set<string>;
  retryMap: Map<string, SavedObjectsImportRetry>;
  retryDestinations: Set<string>;
};

interface InexactMatch<T> {
  object: SavedObject<T>;
  destinations: Array<{ id: string; title?: string; updatedAt?: string }>;
}
interface Left<T> {
  tag: 'left';
  value: InexactMatch<T>;
}
interface Right<T> {
  tag: 'right';
  value: SavedObject<T>;
}
type Either<T> = Left<T> | Right<T>;
const isLeft = <T>(object: Either<T>): object is Left<T> => object.tag === 'left';

const MAX_CONCURRENT_SEARCHES = 10;

const transformObjectsToAmbiguousConflictFields = (
  objects: Array<SavedObject<{ title?: string }>>
) =>
  objects
    .map(({ id, attributes, updated_at: updatedAt }) => ({
      id,
      title: attributes?.title,
      updatedAt,
    }))
    // Sort to ensure that integration tests are not flaky
    .sort((a, b) => {
      const aUpdatedAt = a.updatedAt ?? '';
      const bUpdatedAt = b.updatedAt ?? '';
      if (aUpdatedAt !== bUpdatedAt) {
        return aUpdatedAt < bUpdatedAt ? 1 : -1; // descending
      }
      return a.id < b.id ? -1 : 1; // ascending
    });
const getAmbiguousConflictSourceKey = <T>({ object }: InexactMatch<T>) =>
  getObjectKey({ type: object.type, id: object.originId || object.id });

/**
 * Make a search request for an import object to check if any objects of this type that match this object's `originId` or `id` exist in the
 * specified namespace:
 *  - A `Right` result indicates that no conflict destinations were found in this namespace ("no match").
 *  - A `Left` result indicates that one or more conflict destinations exist in this namespace, none of which exactly match this object's ID
 *    ("inexact match"). We can make this assumption because any "exact match" conflict errors would have been obtained and filtered out by
 *    the `checkConflicts` submodule, which is called before this, *or* if `overwrite: true` is used, we explicitly filter out any pending
 *    overwrites for exact matches.
 */
const checkOriginConflict = async (
  params: CheckOriginConflictParams
): Promise<Either<{ title?: string }>> => {
  const {
    object,
    savedObjectsClient,
    typeRegistry,
    namespace,
    objectIdsBeingImported,
    pendingOverwrites,
    retryMap,
    retryDestinations,
  } = params;
  const { type, originId, id } = object;

  const key = getObjectKey(object);
  const retry = retryMap.get(key);
  if (
    !typeRegistry.isMultiNamespace(type) ||
    pendingOverwrites.has(key) ||
    !!retry?.destinationId
  ) {
    // Skip the search request for non-multi-namespace types, since by definition they cannot have inexact matches or ambiguous conflicts.
    // Also skip the search request for objects that we've already determined have an "exact match" conflict.
    // Finally, skip the search request for objects that have specified a destinationId for a retry.

    // The checkConflicts function is always called before this one. There are three situations where a retry would have a destinationId:
    //   1. retry with overwrite=false, where the object already exists -> checkConflicts would return a conflict error
    //   2. retry with overwrite=true, where the object already exists -> checkConflicts would add an entry to pendingOverwrites
    //   3. retry where the object *doesn't* exist -> checkConflicts wouldn't return an error _or_ add an entry to pendingOverwrites
    // Scenario (3) is why we check to see if there is a retry destinationId and skip the origin check in that case.
    return { tag: 'right', value: object };
  }

  const findOptions = {
    type,
    search: createOriginQuery(type, originId || id),
    rootSearchFields: ['_id', 'originId'],
    page: 1,
    perPage: 10,
    fields: ['title'],
    sortField: 'updated_at',
    sortOrder: 'desc' as const,
    ...(namespace && { namespaces: [namespace] }),
  };
  const findResult = await savedObjectsClient.find<{ title?: string }>(findOptions);
  const { total, saved_objects: savedObjects } = findResult;
  if (total === 0) {
    return { tag: 'right', value: object };
  }
  // This is an "inexact match" so far; filter the conflict destination(s) to exclude any that exactly match other objects we are importing.
  const objects = savedObjects.filter((obj) => {
    const destKey = getObjectKey(obj);
    return !objectIdsBeingImported.has(destKey) && !retryDestinations.has(destKey);
  });
  const destinations = transformObjectsToAmbiguousConflictFields(objects);
  if (destinations.length === 0) {
    // No conflict destinations remain after filtering, so this is a "no match" result.
    return { tag: 'right', value: object };
  }
  return { tag: 'left', value: { object, destinations } };
};

/**
 * This function takes all objects to import, and checks "multi-namespace" types for potential conflicts. An object with a multi-namespace
 * type may include an `originId` field, which means that it should conflict with other objects that originate from the same source.
 * Expected behavior of importing saved objects (single-namespace or multi-namespace):
 *  1. The object 'foo' is exported from space A and imported to space B -- a new object 'bar' is created.
 *  2. Then, the object 'bar' is exported from space B and imported to space C -- a new object 'baz' is created.
 *  3. Then, the object 'baz' is exported from space C to space A -- the object conflicts with 'foo', which must be overwritten to continue.
 * This behavior originated with "single-namespace" types, and this function was added to ensure importing objects of multi-namespace types
 * will behave in the same way.
 *
 * To achieve this behavior for multi-namespace types, a search request is made for each object to determine if any objects of this type
 * that match this object's `originId` or `id` exist in the specified namespace:
 *  - If this is a `Right` result; return the import object and allow `createSavedObjects` to handle the conflict (if any).
 *  - If this is a `Left` "partial match" result:
 *     A. If there is a single source and destination match, add the destination to the importStateMap and return the import object, which
 *        will allow `createSavedObjects` to modify the ID before creating the object (thus ensuring a conflict during).
 *     B. Otherwise, this is an "ambiguous conflict" result; return an error.
 */
export async function checkOriginConflicts({
  objects,
  retries = [],
  ...params
}: CheckOriginConflictsParams) {
  const objectIdsBeingImported = new Set<string>();
  for (const [key, { isOnlyReference }] of params.importStateMap.entries()) {
    if (!isOnlyReference) {
      objectIdsBeingImported.add(key);
    }
  }
  const retryMap = retries.reduce(
    (acc, cur) => acc.set(getObjectKey(cur), cur),
    new Map<string, SavedObjectsImportRetry>()
  );
  const retryDestinations = retries.reduce((acc, cur) => {
    if (cur.destinationId) {
      acc.add(getObjectKey({ type: cur.type, id: cur.destinationId }));
    }
    return acc;
  }, new Set<string>());
  // Check each object for possible destination conflicts, ensuring we don't too many concurrent searches running.
  const mapper = async (object: SavedObject<{ title?: string }>) =>
    checkOriginConflict({ object, objectIdsBeingImported, retryMap, retryDestinations, ...params });
  const checkOriginConflictResults = await pMap(objects, mapper, {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });

  // Get a map of all inexact matches that share the same destination(s).
  const ambiguousConflictSourcesMap = checkOriginConflictResults
    .filter(isLeft)
    .reduce((acc, cur) => {
      const key = getAmbiguousConflictSourceKey(cur.value);
      const value = acc.get(key) ?? [];
      return acc.set(key, [...value, cur.value.object]);
    }, new Map<string, Array<SavedObject<{ title?: string }>>>());

  const errors: SavedObjectsImportFailure[] = [];
  const importStateMap: ImportStateMap = new Map();
  const pendingOverwrites = new Set<string>();
  checkOriginConflictResults.forEach((result) => {
    if (!isLeft(result)) {
      return;
    }
    const ambiguousConflictsSourceKey = getAmbiguousConflictSourceKey(result.value);
    const sources = transformObjectsToAmbiguousConflictFields(
      ambiguousConflictSourcesMap.get(ambiguousConflictsSourceKey)!
    );
    const { object, destinations } = result.value;
    const { type, id, attributes } = object;
    if (sources.length === 1 && destinations.length === 1) {
      // This is a simple "inexact match" result -- a single import object has a single destination conflict.
      const key = getObjectKey(object);
      if (params.ignoreRegularConflicts || retryMap.get(key)?.overwrite) {
        importStateMap.set(key, { destinationId: destinations[0].id });
        pendingOverwrites.add(key);
      } else {
        const { title } = attributes;
        errors.push({
          type,
          id,
          meta: { title },
          error: {
            type: 'conflict',
            destinationId: destinations[0].id,
          },
        });
      }
      return;
    }
    // This is an ambiguous conflict error, which is one of the following cases:
    //  - a single import object has 2+ destination conflicts ("ambiguous destination")
    //  - 2+ import objects have the same single destination conflict ("ambiguous source")
    //  - 2+ import objects have the same 2+ destination conflicts ("ambiguous source and destination")
    if (sources.length > 1) {
      // In the case of ambiguous source conflicts, don't treat them as errors; instead, regenerate the object ID and reset its origin
      // (e.g., the same outcome as if `createNewCopies` was enabled for the entire import operation).
      importStateMap.set(getObjectKey(object), { destinationId: uuidv4(), omitOriginId: true });
      return;
    }
    const { title } = attributes;
    errors.push({
      type,
      id,
      meta: { title },
      error: {
        type: 'ambiguous_conflict',
        destinations,
      },
    });
  });

  return { errors, importStateMap, pendingOverwrites };
}
