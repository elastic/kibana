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
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
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

type ImportWarning = ImportReferencedObjectsResponse['warnings'][number];
type CoreResults = Required<Pick<SavedObjectsImportResponse, 'successResults' | 'errors'>>;

type MissingReferencesFailure = SavedObjectsImportFailure & {
  error: SavedObjectsImportMissingReferencesError;
};

const isMissingReferences = (
  failure: SavedObjectsImportFailure
): failure is MissingReferencesFailure => failure.error.type === 'missing_references';

const addMissingReferenceWarnings = (
  failures: MissingReferencesFailure[],
  warnings: Map<string, ImportWarning>
): void => {
  failures.forEach(({ type, id, error }) => {
    error.references.forEach((reference) => {
      warnings.set(`${toKey({ type, id })}>${toKey(reference)}`, {
        type: 'missing_reference',
        from: { type, id },
        reference: { type: reference.type, id: reference.id },
      });
    });
  });
};

/** Retries objects through core, again with `ignoreMissingReferences` for those with missing references, since core writes nothing while any are missing. */
const resolveIgnoringMissingReferences = async (
  importer: ISavedObjectsImporter,
  storedObjects: SavedObject[],
  retries: SavedObjectsImportRetry[],
  createNewCopies: boolean,
  warnings: Map<string, ImportWarning>
): Promise<CoreResults> => {
  const resolve = (retried: SavedObjectsImportRetry[]) =>
    importer.resolveImportErrors({
      readStream: createListStream(storedObjects),
      retries: retried,
      createNewCopies,
    });

  const resolved = await resolve(retries);
  const missing = (resolved.errors ?? []).filter(isMissingReferences);
  if (missing.length === 0) {
    return { successResults: resolved.successResults ?? [], errors: resolved.errors ?? [] };
  }

  addMissingReferenceWarnings(missing, warnings);
  const missingKeys = new Set(missing.map(toKey));
  const { successResults = [], errors = [] } = await resolve(
    retries.map((retry) =>
      missingKeys.has(toKey(retry)) ? { ...retry, ignoreMissingReferences: true } : retry
    )
  );
  return { successResults, errors };
};

const writePendingObjects = async (
  importer: ISavedObjectsImporter,
  storedObjects: SavedObject[],
  createNewCopies: boolean,
  { successResults = [], errors = [] }: SavedObjectsImportResponse,
  warnings: Map<string, ImportWarning>
): Promise<CoreResults> => {
  // Core writes nothing while any object has a resolvable error, so SOM's flyout retries the rest.
  const hasPendingObjects = errors.some(({ error }) =>
    ['conflict', 'ambiguous_conflict', 'missing_references'].includes(error.type)
  );
  if (!hasPendingObjects) {
    return { successResults, errors };
  }

  // Missing references don't block the import: those objects are retried and reported as warnings.
  const missing = errors.filter(isMissingReferences);
  addMissingReferenceWarnings(missing, warnings);
  const missingKeys = new Set(missing.map(toKey));
  const otherErrors = errors.filter((failure) => !isMissingReferences(failure));
  // An object that also conflicts stays a conflict; core reports it again on the retry.
  const retries: SavedObjectsImportRetry[] = [
    ...successResults.map(({ type, id, overwrite, destinationId, createNewCopy }) => ({
      type,
      id,
      overwrite: overwrite ?? false,
      destinationId,
      createNewCopy,
      replaceReferences: [],
    })),
    ...missing.map(({ type, id, overwrite }) => ({
      type,
      id,
      overwrite: overwrite ?? false,
      replaceReferences: [],
      ignoreMissingReferences: true,
    })),
  ];
  if (retries.length === 0) {
    return { successResults: [], errors: otherErrors };
  }

  const resolved = await resolveIgnoringMissingReferences(
    importer,
    storedObjects,
    retries,
    // With new copies, core gives the retried objects new IDs again.
    createNewCopies,
    warnings
  );
  // Objects retried for their missing references get their result from the retry.
  return {
    successResults: resolved.successResults,
    errors: [
      ...otherErrors.filter((failure) => !missingKeys.has(toKey(failure))),
      ...resolved.errors,
    ],
  };
};

type ExportedObject = ImportReferencedObjectsRequest['objects'][number];
type Decision = NonNullable<ImportReferencedObjectsRequest['decisions']>[number];

const toStoredObjects = (
  objects: ExportedObject[],
  registry: ApiBodyRegistry,
  typeRegistry: ISavedObjectTypeRegistry,
  results: Map<string, ImportResult>
): SavedObject[] => {
  const storedObjects: SavedObject[] = [];
  for (const { type, id, data } of objects) {
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
  return storedObjects;
};

const addCoreResults = (
  { successResults, errors }: CoreResults,
  results: Map<string, ImportResult>
): void => {
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
};

/**
 * Resolves the conflicts of an earlier import: overwrites through core's `resolveImportErrors`,
 * which writes only the retried objects, and skips by leaving the existing object as it is.
 */
const applyDecisions = async (
  importer: ISavedObjectsImporter,
  objects: ExportedObject[],
  decisions: Decision[],
  registry: ApiBodyRegistry,
  typeRegistry: ISavedObjectTypeRegistry,
  results: Map<string, ImportResult>,
  warnings: Map<string, ImportWarning>
): Promise<void> => {
  const overwrites = new Map<string, Decision>();
  decisions.forEach((decision) => {
    const { type, id, action, destination_id: destinationId = id } = decision;
    if (action === 'skip') {
      results.set(toKey(decision), { type, id, destination_id: destinationId, status: 'skipped' });
    } else {
      overwrites.set(toKey(decision), decision);
    }
  });

  const storedObjects = toStoredObjects(
    objects.filter((object) => overwrites.has(toKey(object))),
    registry,
    typeRegistry,
    results
  );
  if (storedObjects.length === 0) return;

  addCoreResults(
    await resolveIgnoringMissingReferences(
      importer,
      storedObjects,
      storedObjects.map(({ type, id }) => {
        const decision = overwrites.get(toKey({ type, id }));
        return {
          type,
          id,
          overwrite: true,
          // Core writes to the conflicting object, which can have another ID across spaces.
          ...(decision?.destination_id && { destinationId: decision.destination_id }),
          replaceReferences: [],
        };
      }),
      false,
      warnings
    ),
    results
  );
};

/** Imports API bodies through core's importer, or with `decisions` resolves an earlier import's conflicts. */
export const importReferencedObjects = async ({
  client,
  importer,
  registry,
  typeRegistry,
  objects,
  mode,
  decisions,
}: ImportReferencedObjectsRequest & {
  client: SavedObjectsClientContract;
  importer: ISavedObjectsImporter;
  registry: ApiBodyRegistry;
  typeRegistry: ISavedObjectTypeRegistry;
}): Promise<ImportReferencedObjectsResponse> => {
  const results = new Map<string, ImportResult>();
  const warnings = new Map<string, ImportWarning>();

  if (decisions) {
    await applyDecisions(importer, objects, decisions, registry, typeRegistry, results, warnings);
  } else {
    const createNewCopies = mode === 'new_copies';
    // Decided before validation, so an existing object is reused even if its exported body is invalid.
    const reusedKeys = createNewCopies
      ? await findReusedKeys(client, registry, objects)
      : new Set<string>();
    objects
      .filter((object) => reusedKeys.has(toKey(object)))
      .forEach(({ type, id }) => {
        results.set(toKey({ type, id }), { type, id, destination_id: id, status: 'reused' });
      });

    const storedObjects = toStoredObjects(
      objects.filter((object) => !reusedKeys.has(toKey(object))),
      registry,
      typeRegistry,
      results
    );
    if (storedObjects.length > 0) {
      const imported = await importer.import({
        readStream: createListStream(storedObjects),
        overwrite: mode === 'overwrite',
        createNewCopies,
      });
      addCoreResults(
        await writePendingObjects(importer, storedObjects, createNewCopies, imported, warnings),
        results
      );
    }
  }

  // One result per requested object that this call handled, in request order.
  const orderedResults = objects.flatMap((object) => results.get(toKey(object)) ?? []);
  return {
    success: orderedResults.every(({ status }) => status !== 'conflict' && status !== 'error'),
    results: orderedResults,
    warnings: [...warnings.values()],
  };
};
