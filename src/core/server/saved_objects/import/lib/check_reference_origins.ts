/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import pMap from 'p-map';
import { SavedObjectsClientContract } from '../../types';
import { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { ImportStateMap, ImportStateValue } from './types';
import { getObjectKey, parseObjectKey } from '../../service/lib/internal_utils';
import { createOriginQuery } from './utils';

export interface CheckReferenceOriginsParams {
  savedObjectsClient: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  namespace?: string;
  importStateMap: ImportStateMap;
}

interface Reference {
  type: string;
  id: string;
}

const MAX_CONCURRENT_SEARCHES = 10;

/**
 * Searches for any existing object(s) for the given reference; if there is exactly one object with a matching origin *and* its ID is
 * different than this reference ID, then this returns the different ID. Otherwise, it returns null.
 */
async function checkOrigin(
  type: string,
  id: string,
  savedObjectsClient: SavedObjectsClientContract,
  namespace: string | undefined
) {
  const findOptions = {
    type,
    search: createOriginQuery(type, id),
    rootSearchFields: ['_id', 'originId'],
    page: 1,
    perPage: 1, // we only need one result for now
    fields: ['title'], // we don't actually need the object's title, we just specify one field so we don't fetch *all* fields
    sortField: 'updated_at',
    sortOrder: 'desc' as const,
    ...(namespace && { namespaces: [namespace] }),
  };
  const findResult = await savedObjectsClient.find<{ title?: string }>(findOptions);
  const { total, saved_objects: savedObjects } = findResult;
  if (total === 1) {
    const [object] = savedObjects;
    if (id !== object.id) {
      return {
        key: getObjectKey({ type, id }),
        value: { isOnlyReference: true, destinationId: object.id } as ImportStateValue,
      };
    }
  }
  // TODO: if the total is 2+, return an "ambiguous reference origin match" to the consumer (#120313)
  return null;
}

export async function checkReferenceOrigins(params: CheckReferenceOriginsParams) {
  const { savedObjectsClient, namespace } = params;
  const referencesToCheck: Reference[] = [];
  for (const [key, { isOnlyReference }] of params.importStateMap.entries()) {
    const { type, id } = parseObjectKey(key);
    if (params.typeRegistry.isMultiNamespace(type) && isOnlyReference) {
      referencesToCheck.push({ type, id });
    }
  }
  // Check each object for possible destination conflicts, ensuring we don't too many concurrent searches running.
  const mapper = async ({ type, id }: Reference) =>
    checkOrigin(type, id, savedObjectsClient, namespace);
  const checkOriginResults = await pMap(referencesToCheck, mapper, {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });

  const importStateMap: ImportStateMap = new Map();
  for (const result of checkOriginResults) {
    if (result) {
      const { key, value } = result;
      importStateMap.set(key, value);
    }
  }

  return { importStateMap };
}
