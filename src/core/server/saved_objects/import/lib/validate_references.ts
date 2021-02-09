/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject, SavedObjectsClientContract } from '../../types';
import { SavedObjectsImportFailure, SavedObjectsImportRetry } from '../types';
import { SavedObjectsImportError } from '../errors';

const REF_TYPES_TO_VALIDATE = ['index-pattern', 'search'];

function filterReferencesToValidate({ type }: { type: string }) {
  return REF_TYPES_TO_VALIDATE.includes(type);
}
const getObjectsToSkip = (retries: SavedObjectsImportRetry[] = []) =>
  retries.reduce(
    (acc, { type, id, ignoreMissingReferences }) =>
      ignoreMissingReferences ? acc.add(`${type}:${id}`) : acc,
    new Set<string>()
  );

export async function getNonExistingReferenceAsKeys(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract,
  namespace?: string,
  retries?: SavedObjectsImportRetry[]
) {
  const objectsToSkip = getObjectsToSkip(retries);
  const collector = new Map();
  // Collect all references within objects
  for (const savedObject of savedObjects) {
    if (objectsToSkip.has(`${savedObject.type}:${savedObject.id}`)) {
      // skip objects with retries that have specified `ignoreMissingReferences`
      continue;
    }
    const filteredReferences = (savedObject.references || []).filter(filterReferencesToValidate);
    for (const { type, id } of filteredReferences) {
      collector.set(`${type}:${id}`, { type, id });
    }
  }

  // Remove objects that could be references
  for (const savedObject of savedObjects) {
    collector.delete(`${savedObject.type}:${savedObject.id}`);
  }
  if (collector.size === 0) {
    return [];
  }

  // Fetch references to see if they exist
  const bulkGetOpts = Array.from(collector.values()).map((obj) => ({ ...obj, fields: ['id'] }));
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
    collector.delete(`${savedObject.type}:${savedObject.id}`);
  }

  return [...collector.keys()];
}

export async function validateReferences(
  savedObjects: Array<SavedObject<{ title?: string }>>,
  savedObjectsClient: SavedObjectsClientContract,
  namespace?: string,
  retries?: SavedObjectsImportRetry[]
) {
  const objectsToSkip = getObjectsToSkip(retries);
  const errorMap: { [key: string]: SavedObjectsImportFailure } = {};
  const nonExistingReferenceKeys = await getNonExistingReferenceAsKeys(
    savedObjects,
    savedObjectsClient,
    namespace,
    retries
  );

  // Filter out objects with missing references, add to error object
  savedObjects.forEach(({ type, id, references, attributes }) => {
    if (objectsToSkip.has(`${type}:${id}`)) {
      // skip objects with retries that have specified `ignoreMissingReferences`
      return;
    }

    const missingReferences = [];
    const enforcedTypeReferences = (references || []).filter(filterReferencesToValidate);
    for (const { type: refType, id: refId } of enforcedTypeReferences) {
      if (nonExistingReferenceKeys.includes(`${refType}:${refId}`)) {
        missingReferences.push({ type: refType, id: refId });
      }
    }
    if (missingReferences.length === 0) {
      return;
    }
    const { title } = attributes;
    errorMap[`${type}:${id}`] = {
      id,
      type,
      title,
      meta: { title },
      error: { type: 'missing_references', references: missingReferences },
    };
  });

  return Object.values(errorMap);
}
