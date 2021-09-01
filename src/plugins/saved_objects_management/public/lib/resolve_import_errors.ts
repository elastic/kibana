/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  HttpStart,
  SavedObjectsImportConflictError,
  SavedObjectsImportRetry,
  SavedObjectsImportResponse,
  SavedObjectsImportAmbiguousConflictError,
} from 'src/core/public';
import { Required } from '@kbn/utility-types';
import { FailedImport, ProcessedImportResponse } from './process_import_response';
import { getObjectKey } from './get_object_key';

// the HTTP route requires type and ID; all other field are optional
type RetryObject = Required<Partial<SavedObjectsImportRetry>, 'type' | 'id'>;

interface Reference {
  type: string;
  from: string;
  to: string;
}

export interface RetryDecision {
  retry: boolean; // false == skip
  options: { overwrite: boolean; destinationId?: string };
}

const RESOLVABLE_ERRORS = ['conflict', 'ambiguous_conflict', 'missing_references'];

export interface FailedImportConflict {
  obj: FailedImport['obj'];
  error: SavedObjectsImportConflictError | SavedObjectsImportAmbiguousConflictError;
}

const isConflict = (
  failure: FailedImport
): failure is { obj: FailedImport['obj']; error: SavedObjectsImportConflictError } =>
  failure.error.type === 'conflict';
const isAmbiguousConflict = (
  failure: FailedImport
): failure is { obj: FailedImport['obj']; error: SavedObjectsImportAmbiguousConflictError } =>
  failure.error.type === 'ambiguous_conflict';
const isAnyConflict = (failure: FailedImport): failure is FailedImportConflict =>
  isConflict(failure) || isAmbiguousConflict(failure);

/**
 * The server-side code was updated to include missing_references errors and conflict/ambiguous_conflict errors for the same object in the
 * same response. This client-side code was not built to handle multiple errors for a single import object, though. We simply filter out any
 * conflicts if a missing_references error for the same object is present. This means that the missing_references error will get resolved
 * or skipped first, and any conflicts still present will be returned again and resolved with another API call.
 */
const filterFailedImports = (failures: FailedImport[]) => {
  const missingReferences = failures
    .filter(({ error: { type } }) => type === 'missing_references')
    .reduce((acc, { obj }) => acc.add(getObjectKey(obj)), new Set<string>());
  return failures.filter(
    (failure) =>
      !isAnyConflict(failure) ||
      (isAnyConflict(failure) && !missingReferences.has(getObjectKey(failure.obj)))
  );
};

async function callResolveImportErrorsApi(
  http: HttpStart,
  file: File,
  retries: any,
  createNewCopies: boolean,
  importNamespaces: boolean
): Promise<SavedObjectsImportResponse> {
  const endpoint = importNamespaces
    ? '_resolve_import_errors_across_space'
    : '_resolve_import_errors';
  const formData = new FormData();
  formData.append('file', file);
  formData.append('retries', JSON.stringify(retries));
  const query = createNewCopies ? { createNewCopies } : {};
  return http.post<any>(`/api/saved_objects/${endpoint}`, {
    headers: {
      // Important to be undefined, it forces proper headers to be set for FormData
      'Content-Type': undefined,
    },
    body: formData,
    query,
  });
}

function mapImportFailureToRetryObject({
  failure,
  retryDecisionCache,
  replaceReferencesCache,
  state,
}: {
  failure: FailedImport;
  retryDecisionCache: Map<string, RetryDecision>;
  replaceReferencesCache: Map<string, Reference[]>;
  state: { unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'] };
}): RetryObject | undefined {
  const { unmatchedReferences = [] } = state;
  const retryDecision = retryDecisionCache.get(getObjectKey(failure.obj));

  // Conflicts without a resolution are skipped
  if (
    !retryDecision?.retry &&
    (failure.error.type === 'conflict' || failure.error.type === 'ambiguous_conflict')
  ) {
    return;
  }

  // Replace references if user chose a new reference
  if (failure.error.type === 'missing_references') {
    const objReplaceReferences = replaceReferencesCache.get(getObjectKey(failure.obj)) || [];
    const indexPatternRefs = failure.error.references.filter((obj) => obj.type === 'index-pattern');
    for (const reference of indexPatternRefs) {
      for (const { existingIndexPatternId: from, newIndexPatternId: to } of unmatchedReferences) {
        const matchesIndexPatternId = from === reference.id;
        if (!to || !matchesIndexPatternId) {
          continue;
        }
        const type = 'index-pattern';
        if (
          !objReplaceReferences.some(
            (ref) => ref.type === type && ref.from === from && ref.to === to
          )
        ) {
          objReplaceReferences.push({ type, from, to });
        }
      }
    }
    replaceReferencesCache.set(getObjectKey(failure.obj), objReplaceReferences);
    // Skip if nothing to replace, the UI option selected would be --Skip Import--
    if (objReplaceReferences.length === 0) {
      return;
    }
  }

  return {
    id: failure.obj.id,
    type: failure.obj.type,
    ...(retryDecision?.retry && retryDecision.options),
    replaceReferences: replaceReferencesCache.get(getObjectKey(failure.obj)),
  };
}

export async function resolveImportErrors({
  http,
  getConflictResolutions,
  state,
}: {
  http: HttpStart;
  getConflictResolutions: (
    objects: FailedImportConflict[]
  ) => Promise<Record<string, RetryDecision>>;
  state: {
    importCount: number;
    unmatchedReferences?: ProcessedImportResponse['unmatchedReferences'];
    failedImports?: ProcessedImportResponse['failedImports'];
    successfulImports?: ProcessedImportResponse['successfulImports'];
    file?: File;
    importMode: { createNewCopies: boolean; overwrite: boolean };
    importNamespaces: boolean;
  };
}) {
  const retryDecisionCache = new Map<string, RetryDecision>();
  const replaceReferencesCache = new Map<string, Reference[]>();
  let { importCount, failedImports = [], successfulImports = [] } = state;
  const {
    file,
    importMode: { createNewCopies, overwrite: isOverwriteAllChecked },
  } = state;

  const doesntHaveRetryDecision = ({ obj }: FailedImport) => {
    return !retryDecisionCache.has(getObjectKey(obj));
  };
  const getRetryDecision = ({ obj }: FailedImport) => {
    return retryDecisionCache.get(getObjectKey(obj));
  };
  const callMapImportFailure = (failure: FailedImport) =>
    mapImportFailureToRetryObject({
      failure,
      retryDecisionCache,
      replaceReferencesCache,
      state,
    });
  const isNotSkipped = (failure: FailedImport) => {
    const { type } = failure.error;
    return !RESOLVABLE_ERRORS.includes(type) || getRetryDecision(failure)?.retry;
  };

  // Loop until all issues are resolved
  while (failedImports.some((failure) => RESOLVABLE_ERRORS.includes(failure.error.type))) {
    // Filter out multiple errors for the same object
    const filteredFailures = filterFailedImports(failedImports);

    // Resolve regular conflicts
    if (isOverwriteAllChecked) {
      filteredFailures.filter(isConflict).forEach(({ obj, error: { destinationId } }) =>
        retryDecisionCache.set(getObjectKey(obj), {
          retry: true,
          options: {
            overwrite: true,
            ...(destinationId && { destinationId }),
          },
        })
      );
    }

    // prompt the user for each conflict
    const result = await getConflictResolutions(
      isOverwriteAllChecked
        ? filteredFailures.filter(isAmbiguousConflict).filter(doesntHaveRetryDecision)
        : filteredFailures.filter(isAnyConflict).filter(doesntHaveRetryDecision)
    );
    for (const key of Object.keys(result)) {
      retryDecisionCache.set(key, result[key]);
    }

    // Build retries array
    const failRetries = filteredFailures
      .map(callMapImportFailure)
      .filter((obj) => !!obj) as RetryObject[];
    const successRetries = successfulImports.map<RetryObject>((object) => {
      const { type, id, overwrite, destinationId, createNewCopy } = object;
      const replaceReferences = replaceReferencesCache.get(getObjectKey(object));
      return {
        type,
        id,
        ...(overwrite && { overwrite }),
        ...(replaceReferences && { replaceReferences }),
        destinationId,
        createNewCopy,
      };
    });
    const retries = [...failRetries, ...successRetries];

    // Scenario where there were no success results, all errors were skipped, and nothing to retry
    if (retries.length === 0) {
      // Cancelled overwrites aren't failures anymore
      failedImports = filteredFailures.filter(isNotSkipped);
      break;
    }

    // Call API
    const response = await callResolveImportErrorsApi(
      http,
      file!,
      retries,
      createNewCopies,
      state.importNamespaces
    );
    importCount = response.successCount; // reset the success count since we retry all successful results each time
    failedImports = [];
    for (const { error, ...obj } of response.errors || []) {
      failedImports.push({ error, obj });
    }
    successfulImports = response.successResults || [];
  }

  return {
    status: 'success',
    importCount,
    failedImports,
    successfulImports,
  };
}
