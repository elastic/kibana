/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as esKuery from '@kbn/es-query';
import { getObjectKey } from './internal_utils';
import type { CreatePointInTimeFinderFn } from './point_in_time_finder';
import { ALL_NAMESPACES_STRING } from './utils';

interface ObjectOrigin {
  /** The object's type. */
  type: string;
  /** The object's origin is its `originId` field, or its `id` field if that is unavailable. */
  origin: string;
}

/**
 * Fetches all objects with a shared origin, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export async function findSharedOriginObjects(
  createPointInTimeFinder: CreatePointInTimeFinderFn,
  objects: ObjectOrigin[],
  perPage?: number
) {
  if (!objects.length) {
    return new Map<string, Set<string>>();
  }

  const uniqueObjectTypes = objects.reduce((acc, { type }) => acc.add(type), new Set<string>());
  const filter = createAliasKueryFilter(objects);
  const finder = createPointInTimeFinder({
    type: [...uniqueObjectTypes],
    perPage,
    filter,
    fields: ['not-a-field'], // Specify a non-existent field to avoid fetching all type-level fields (we only care about root-level fields)
    namespaces: [ALL_NAMESPACES_STRING], // We need to search across all spaces to have accurate results
  });
  // NOTE: this objectsMap is only used internally (not in an API that is documented for public consumption), and it contains the minimal
  // amount of information to satisfy our UI needs today. We will need to change this in the future when we implement merging in #130311.
  const objectsMap = new Map<string, Set<string>>();
  let error: Error | undefined;
  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      for (const savedObject of savedObjects) {
        const { type, id, originId, namespaces = [] } = savedObject;
        const key = getObjectKey({ type, id: originId || id });
        const val = objectsMap.get(key) ?? new Set<string>();
        const filteredNamespaces =
          namespaces.includes(ALL_NAMESPACES_STRING) || val.has(ALL_NAMESPACES_STRING)
            ? [ALL_NAMESPACES_STRING]
            : [...val, ...namespaces];
        objectsMap.set(key, new Set([...filteredNamespaces]));
      }
    }
  } catch (e) {
    error = e;
  }

  try {
    await finder.close();
  } catch (e) {
    if (!error) {
      error = e;
    }
  }

  if (error) {
    throw new Error(`Failed to retrieve shared origin objects: ${error.message}`);
  }
  return objectsMap;
}

function createAliasKueryFilter(objects: Array<{ type: string; origin: string }>) {
  const { buildNode } = esKuery.nodeTypes.function;
  // Note: these nodes include '.attributes' for type-level fields because these are eventually passed to `validateConvertFilterToKueryNode`, which requires it
  const kueryNodes = objects
    .reduce<unknown[]>((acc, { type, origin }) => {
      // Escape Kuery values to prevent parsing errors and unintended behavior (object types/IDs can contain KQL special characters/operators)
      const match1 = buildNode('is', `${type}.id`, esKuery.escapeKuery(`${type}:${origin}`)); // here we are looking for the raw document `_id` field, which has a `type:` prefix
      const match2 = buildNode('is', `${type}.originId`, esKuery.escapeKuery(origin)); // here we are looking for the saved object's `originId` field, which does not have a `type:` prefix
      acc.push([match1, match2]);
      return acc;
    }, [])
    .flat();
  return buildNode('or', kueryNodes);
}
