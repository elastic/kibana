/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract } from '../../types';
import type { ObjectKeyProvider } from '../lib';
import { SavedObjectsBulkGetObject } from '../../service';
import { SavedObjectsImportFailure, SavedObjectsImportRetry } from '../types';
import { SavedObjectsImportError } from '../errors';

const REF_TYPES_TO_VALIDATE = ['index-pattern', 'search'];

function filterReferencesToValidate({ type }: { type: string }) {
  return REF_TYPES_TO_VALIDATE.includes(type);
}

const getObjectsToSkip = (retries: SavedObjectsImportRetry[] = [], getObjKey: ObjectKeyProvider) =>
  retries.reduce(
    (acc, { ignoreMissingReferences, ...obj }) =>
      ignoreMissingReferences ? acc.add(getObjKey(obj)) : acc,
    new Set<string>()
  );

export async function getNonExistingReferenceAsKeys({
  savedObjects,
  savedObjectsClient,
  getObjKey,
  namespace,
  retries,
}: {
  savedObjects: Array<SavedObject<{ title?: string }>>;
  savedObjectsClient: SavedObjectsClientContract;
  getObjKey: ObjectKeyProvider;
  namespace?: string;
  retries?: SavedObjectsImportRetry[];
}) {
  const objectsToSkip = getObjectsToSkip(retries, getObjKey);
  const collector = new Map<string, { type: string; id: string; namespaces?: string[] }>();
  // Collect all references within objects
  for (const savedObject of savedObjects) {
    const objKey = getObjKey(savedObject);

    if (objectsToSkip.has(objKey)) {
      // skip objects with retries that have specified `ignoreMissingReferences`
      continue;
    }
    const filteredReferences = (savedObject.references || []).filter(filterReferencesToValidate);
    for (const { type, id } of filteredReferences) {
      const refKey = getObjKey({ type, id, namespaces: savedObject.namespaces });
      collector.set(refKey, { type, id });
    }
  }

  // Remove objects that could be references
  for (const savedObject of savedObjects) {
    collector.delete(getObjKey(savedObject));
  }
  if (collector.size === 0) {
    return [];
  }

  // Fetch references to see if they exist
  const bulkGetOpts: SavedObjectsBulkGetObject[] = [...collector.values()].map((obj) => ({
    id: obj.id,
    type: obj.type,
    namespaces: obj.namespaces,
    fields: ['id'],
  }));
  const bulkGetResponse = await savedObjectsClient.bulkGet(bulkGetOpts, { namespace });

  // Error handling
  const erroredObjects = bulkGetResponse.saved_objects.filter(
    (obj) => obj.error && obj.error.statusCode !== 404
  );
  if (erroredObjects.length) {
    throw SavedObjectsImportError.referencesFetchError(erroredObjects);
  }

  // Cleanup collector
  for (const savedObject of bulkGetResponse.saved_objects) {
    if (savedObject.error) {
      continue;
    }
    collector.delete(getObjKey(savedObject));
  }

  return [...collector.keys()];
}

export async function validateReferences({
  savedObjects,
  savedObjectsClient,
  getObjKey,
  namespace,
  retries,
}: {
  savedObjects: Array<SavedObject<{ title?: string }>>;
  savedObjectsClient: SavedObjectsClientContract;
  getObjKey: ObjectKeyProvider;
  namespace?: string;
  retries?: SavedObjectsImportRetry[];
}) {
  const objectsToSkip = getObjectsToSkip(retries, getObjKey);
  const errorMap: { [key: string]: SavedObjectsImportFailure } = {};
  const nonExistingReferenceKeys = await getNonExistingReferenceAsKeys({
    savedObjects,
    savedObjectsClient,
    retries,
    namespace,
    getObjKey,
  });

  // Filter out objects with missing references, add to error object
  savedObjects.forEach((obj) => {
    const objKey = getObjKey(obj);
    if (objectsToSkip.has(objKey)) {
      // skip objects with retries that have specified `ignoreMissingReferences`
      return;
    }

    const missingReferences = [];
    const enforcedTypeReferences = (obj.references || [])
      .filter(filterReferencesToValidate)
      .map((ref) => ({
        id: ref.id,
        type: ref.type,
        namespaces: obj.namespaces,
      }));
    for (const enforcedRef of enforcedTypeReferences) {
      if (nonExistingReferenceKeys.includes(getObjKey(enforcedRef))) {
        missingReferences.push({ type: enforcedRef.type, id: enforcedRef.id });
      }
    }
    if (missingReferences.length === 0) {
      return;
    }
    const { title } = obj.attributes;
    errorMap[objKey] = {
      id: obj.id,
      type: obj.type,
      title,
      meta: { title },
      error: { type: 'missing_references', references: missingReferences },
    };
  });

  return Object.values(errorMap);
}
