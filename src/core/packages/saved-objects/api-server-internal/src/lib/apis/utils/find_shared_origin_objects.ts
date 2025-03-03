/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as esKuery from '@kbn/es-query';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { getObjectKey } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsCollectMultiNamespaceReferencesPurpose } from '@kbn/core-saved-objects-api-server/src/apis';
import {
  KQL_FUNCTION_AND,
  KQL_FUNCTION_IS,
  KQL_FUNCTION_NOT,
  KQL_FUNCTION_OR,
} from '@kbn/es-query/src/kuery/functions';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';

interface ObjectOrigin {
  /** The object's type. */
  type: string;
  /** The object's ID. */
  id: string;
  /** The object's origin is its `originId` field */
  origin: string | undefined;
}

/**
 * Fetches all objects with a shared origin, returning a map of the matching aliases and what space(s) they exist in.
 *
 * @internal
 */
export async function findSharedOriginObjects(
  createPointInTimeFinder: CreatePointInTimeFinderFn,
  objects: ObjectOrigin[],
  perPage?: number,
  purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose
) {
  if (!objects.length) {
    return new Map<string, Set<string>>();
  }

  const uniqueObjectTypes = objects.reduce((acc, { type }) => acc.add(type), new Set<string>());
  const filter = createOriginKueryFilter(objects, purpose);
  const finder = createPointInTimeFinder(
    {
      type: [...uniqueObjectTypes],
      perPage,
      filter,
      fields: ['not-a-field'], // Specify a non-existent field to avoid fetching all type-level fields (we only care about root-level fields)
      namespaces: [ALL_NAMESPACES_STRING], // We need to search across all spaces to have accurate results
    },
    undefined,
    { disableExtensions: true }
  );
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

function createOriginKueryFilter(
  objects: ObjectOrigin[],
  purpose?: SavedObjectsCollectMultiNamespaceReferencesPurpose
) {
  const { buildNode } = esKuery.nodeTypes.function;
  // Note: these nodes include '.attributes' for type-level fields because these are eventually passed to `validateConvertFilterToKueryNode`, which requires it
  const kueryNodes = objects
    .reduce<unknown[]>((acc, { type, id, origin }) => {
      // Escape Kuery values to prevent parsing errors and unintended behavior (object types/IDs can contain KQL special characters/operators)

      // Look for objects with an ID that matches the origin or ID (has a `type:` prefix)
      const idMatchesOrigin = buildNode(
        KQL_FUNCTION_IS,
        `${type}.id`,
        esKuery.escapeKuery(`${type}:${origin || id}`)
      );

      // Look for objects with an `originId` that matches the origin or ID (does not have a `type:` prefix)
      const originMatch = buildNode(
        KQL_FUNCTION_IS,
        `${type}.originId`,
        esKuery.escapeKuery(origin || id)
      );

      // If we are updating an object's spaces (as opposed to copying)...
      if (purpose === 'updateObjectsSpaces') {
        // we never want to match on the raw document `_id` fields.
        // If they are equal, this just means that the object already exists in that space and it's ok.
        const notIdMatch = buildNode(
          KQL_FUNCTION_NOT,
          buildNode(KQL_FUNCTION_IS, `${type}.id`, esKuery.escapeKuery(`${type}:${id}`))
        );

        // If this object has an origin ID, then we do still want to match if another object's ID matches the
        // object's origin (idMatchesOrigin), or if another object's origin matches the object's origin (originMatch).
        // But if this object does not have an origin ID, we can skip the idMatchesOrigin part altogether
        // and just check if another object's origin ID matches this object's ID (originMatch).
        // (maybe slightly more efficient?)
        acc.push(
          buildNode(KQL_FUNCTION_AND, [
            notIdMatch,
            origin ? buildNode(KQL_FUNCTION_OR, [idMatchesOrigin, originMatch]) : originMatch,
          ])
        );
      } else acc.push([idMatchesOrigin, originMatch]); // If we are copying, things are much simpler

      return acc;
    }, [])
    .flat();
  return buildNode(KQL_FUNCTION_OR, kueryNodes);
}
