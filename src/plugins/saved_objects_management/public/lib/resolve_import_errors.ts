/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
    .reduce((acc, { obj: { type, id } }) => acc.add(`${type}:${id}`), new Set<string>());
  return failures.filter(
    (failure) =>
      !isAnyConflict(failure) ||
      (isAnyConflict(failure) && !missingReferences.has(`${failure.obj.type}:${failure.obj.id}`))
  );
};

async function callResolveImportErrorsApi(
  http: HttpStart,
  file: File,
  retries: any,
  createNewCopies: boolean
): Promise<SavedObjectsImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('retries', JSON.stringify(retries));
  const query = createNewCopies ? { createNewCopies } : {};
  return http.post<any>('/api/saved_objects/_resolve_import_errors', {
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
  const retryDecision = retryDecisionCache.get(`${failure.obj.type}:${failure.obj.id}`);

  // Conflicts without a resolution are skipped
  if (
    !retryDecision?.retry &&
    (failure.error.type === 'conflict' || failure.error.type === 'ambiguous_conflict')
  ) {
    return;
  }

  // Replace references if user chose a new reference
  if (failure.error.type === 'missing_references') {
    const objReplaceReferences =
      replaceReferencesCache.get(`${failure.obj.type}:${failure.obj.id}`) || [];
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
    replaceReferencesCache.set(`${failure.obj.type}:${failure.obj.id}`, objReplaceReferences);
    // Skip if nothing to replace, the UI option selected would be --Skip Import--
    if (objReplaceReferences.length === 0) {
      return;
    }
  }

  return {
    id: failure.obj.id,
    type: failure.obj.type,
    ...(retryDecision?.retry && retryDecision.options),
    replaceReferences: replaceReferencesCache.get(`${failure.obj.type}:${failure.obj.id}`),
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
    return !retryDecisionCache.has(`${obj.type}:${obj.id}`);
  };
  const getRetryDecision = ({ obj }: FailedImport) => {
    return retryDecisionCache.get(`${obj.type}:${obj.id}`);
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
      filteredFailures
        .filter(isConflict)
        .forEach(({ obj: { type, id }, error: { destinationId } }) =>
          retryDecisionCache.set(`${type}:${id}`, {
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
    const successRetries = successfulImports.map<RetryObject>(
      ({ type, id, overwrite, destinationId, createNewCopy }) => {
        const replaceReferences = replaceReferencesCache.get(`${type}:${id}`);
        return {
          type,
          id,
          ...(overwrite && { overwrite }),
          ...(replaceReferences && { replaceReferences }),
          destinationId,
          createNewCopy,
        };
      }
    );
    const retries = [...failRetries, ...successRetries];

    // Scenario where there were no success results, all errors were skipped, and nothing to retry
    if (retries.length === 0) {
      // Cancelled overwrites aren't failures anymore
      failedImports = filteredFailures.filter(isNotSkipped);
      break;
    }

    // Call API
    const response = await callResolveImportErrorsApi(http, file!, retries, createNewCopies);
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
