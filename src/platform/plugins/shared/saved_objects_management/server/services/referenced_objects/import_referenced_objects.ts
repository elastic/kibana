/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ISavedObjectsImporter,
  ISavedObjectTypeRegistry,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsImportResponse,
  SavedObjectTypeIdTuple,
} from '@kbn/core/server';
import { getCurrentVirtualVersion, isSavedObjectErrorResult } from '@kbn/core/server';
import { createListStream } from '@kbn/utils';
import { prettifyError } from '@kbn/zod';
import type { ApiBodyRegistry } from '../api_body_registry';
import type {
  ImportReferencedObjectsRequest,
  ImportReferencedObjectsResponse,
} from '../../../common/referenced_objects_schemas';

type ImportResult = ImportReferencedObjectsResponse['results'][number];

const toKey = ({ type, id }: SavedObjectTypeIdTuple) => `${type}:${id}`;

/**
 * Finds the objects whose entry reuses existing objects and that already exist in the client's
 * space, so new copies point to them. One that exists only in another space isn't found, so it's copied.
 */
const findReusedKeys = async (
  client: SavedObjectsClientContract,
  registry: ApiBodyRegistry,
  objects: SavedObjectTypeIdTuple[]
): Promise<Set<string>> => {
  const candidates = objects
    .filter(({ type }) => registry.get(type)?.reuseExistingInNewCopies)
    .map(({ type, id }) => ({ type, id }));
  if (candidates.length === 0) {
    return new Set();
  }
  const { saved_objects: existing } = await client.bulkGet(candidates);
  return new Set(existing.filter((result) => !isSavedObjectErrorResult(result)).map(toKey));
};

const writePendingObjects = async (
  importer: ISavedObjectsImporter,
  storedObjects: SavedObject[],
  createNewCopies: boolean,
  { successResults = [], errors = [] }: SavedObjectsImportResponse
): Promise<Required<Pick<SavedObjectsImportResponse, 'successResults' | 'errors'>>> => {
  // Core writes nothing while any object has a resolvable error, so SOM's flyout retries the rest.
  const hasPendingObjects = errors.some(({ error }) =>
    ['conflict', 'ambiguous_conflict', 'missing_references'].includes(error.type)
  );
  if (!hasPendingObjects || successResults.length === 0) {
    return { successResults: hasPendingObjects ? [] : successResults, errors };
  }

  const resolved = await importer.resolveImportErrors({
    readStream: createListStream(storedObjects),
    retries: successResults.map(({ type, id, overwrite, destinationId, createNewCopy }) => ({
      type,
      id,
      overwrite: overwrite ?? false,
      destinationId,
      createNewCopy,
      replaceReferences: [],
    })),
    // With new copies, core gives the retried objects new IDs again.
    createNewCopies,
  });
  return {
    successResults: resolved.successResults ?? [],
    errors: [...errors, ...(resolved.errors ?? [])],
  };
};

/**
 * Imports API bodies through core's importer: each body is validated against its type's schema
 * and converted with `toStored`. Throws core's import errors, such as an exceeded size limit.
 */
export const importReferencedObjects = async ({
  client,
  importer,
  registry,
  typeRegistry,
  objects,
  mode,
}: ImportReferencedObjectsRequest & {
  client: SavedObjectsClientContract;
  importer: ISavedObjectsImporter;
  registry: ApiBodyRegistry;
  typeRegistry: ISavedObjectTypeRegistry;
}): Promise<ImportReferencedObjectsResponse> => {
  const results = new Map<string, ImportResult>();
  const storedObjects: SavedObject[] = [];
  const createNewCopies = mode === 'new_copies';
  // Decided before validation, so an existing object is reused even if its exported body is invalid.
  const reusedKeys = createNewCopies
    ? await findReusedKeys(client, registry, objects)
    : new Set<string>();

  for (const { type, id, data } of objects) {
    if (reusedKeys.has(toKey({ type, id }))) {
      results.set(toKey({ type, id }), { type, id, destination_id: id, status: 'reused' });
      continue;
    }

    const addError = (errorType: string, message: string): void => {
      results.set(toKey({ type, id }), {
        type,
        id,
        destination_id: id,
        status: 'error',
        error: { type: errorType, message },
      });
    };

    const entry = registry.get(type);
    if (!entry) {
      addError('unsupported_type', `Saved objects of type [${type}] can't be imported.`);
      continue;
    }

    const parsed = entry.getSchema().safeParse(data);
    if (!parsed.success) {
      addError('invalid_body', prettifyError(parsed.error));
      continue;
    }

    try {
      const { attributes, references } = entry.toStored(parsed.data);
      const savedObjectType = typeRegistry.getType(type);
      storedObjects.push({
        type,
        id,
        attributes,
        references,
        // toStored gives the current shape. Without a version, core's importer would run every
        // migration from the first one, as for a legacy export.
        ...(savedObjectType && {
          typeMigrationVersion: getCurrentVirtualVersion(savedObjectType, false),
        }),
      });
    } catch (e) {
      addError('transform_failed', e.message);
    }
  }

  if (storedObjects.length > 0) {
    const imported = await importer.import({
      readStream: createListStream(storedObjects),
      overwrite: mode === 'overwrite',
      createNewCopies,
    });
    const { successResults, errors } = await writePendingObjects(
      importer,
      storedObjects,
      createNewCopies,
      imported
    );

    successResults.forEach(({ type, id, destinationId, overwrite }) => {
      results.set(toKey({ type, id }), {
        type,
        id,
        destination_id: destinationId ?? id,
        status: overwrite ? 'overwritten' : 'created',
      });
    });

    errors.forEach(({ type, id, error }) => {
      results.set(
        toKey({ type, id }),
        error.type === 'conflict'
          ? { type, id, destination_id: error.destinationId ?? id, status: 'conflict' }
          : {
              type,
              id,
              destination_id: id,
              status: 'error',
              error: { type: error.type, message: 'message' in error ? error.message : error.type },
            }
      );
    });
  }

  // One result per requested object, in request order.
  const orderedResults = objects.flatMap((object) => results.get(toKey(object)) ?? []);
  return {
    success: orderedResults.every(({ status }) => status !== 'conflict' && status !== 'error'),
    results: orderedResults,
    warnings: [],
  };
};
