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

import { HttpStart, SavedObjectsImportConflictError } from 'src/core/public';
import { FailedImport } from './process_import_response';

interface RetryObject {
  id: string;
  type: string;
  overwrite?: boolean;
  replaceReferences?: any[];
}

export type ConflictResolution =
  | { retry: false } // skip
  | {
      retry: true;
      options: { overwrite: false } | { overwrite: true; destinationId?: string };
    };

const RESOLVABLE_ERRORS = ['conflict', 'ambiguous_conflict', 'missing_references'];
export interface FailedImportConflict {
  obj: FailedImport['obj'];
  error: SavedObjectsImportConflictError;
}
const isConflict = (failure: FailedImport): failure is FailedImportConflict =>
  failure.error.type === 'conflict';

async function callResolveImportErrorsApi(http: HttpStart, file: File, retries: any) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('retries', JSON.stringify(retries));
  return http.post<any>('/api/saved_objects/_resolve_import_errors', {
    headers: {
      // Important to be undefined, it forces proper headers to be set for FormData
      'Content-Type': undefined,
    },
    body: formData,
  });
}

function mapImportFailureToRetryObject({
  failure,
  overwriteDecisionCache,
  replaceReferencesCache,
  state,
}: {
  failure: FailedImport;
  overwriteDecisionCache: Map<string, ConflictResolution>;
  replaceReferencesCache: Map<string, any[]>;
  state: any;
}): RetryObject | undefined {
  const { unmatchedReferences } = state;
  const conflictResolution = overwriteDecisionCache.get(`${failure.obj.type}:${failure.obj.id}`);

  // Conflicts without a resolution are skipped
  // Note: if a resolution is marked with overwrite=false, it is a retry without overwrite; this is used in ambiguous conflicts where there
  // are more sources than destinations
  if (
    !conflictResolution?.retry &&
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
      for (const unmatchedReference of unmatchedReferences) {
        const hasNewValue = !!unmatchedReference.newIndexPatternId;
        const matchesIndexPatternId = unmatchedReference.existingIndexPatternId === reference.id;
        if (!hasNewValue || !matchesIndexPatternId) {
          continue;
        }
        objReplaceReferences.push({
          type: 'index-pattern',
          from: unmatchedReference.existingIndexPatternId,
          to: unmatchedReference.newIndexPatternId,
        });
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
    ...(conflictResolution?.retry && conflictResolution.options),
    replaceReferences: replaceReferencesCache.get(`${failure.obj.type}:${failure.obj.id}`) || [],
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
  ) => Promise<Record<string, ConflictResolution>>;
  state: { importCount: number; failedImports?: FailedImport[] } & Record<string, any>;
}) {
  const overwriteDecisionCache = new Map<string, ConflictResolution>();
  const replaceReferencesCache = new Map();
  let { importCount: successImportCount, failedImports: importFailures = [] } = state;
  const { file, isOverwriteAllChecked } = state;

  const doesntHaveOverwriteDecision = ({ obj }: FailedImport) => {
    return !overwriteDecisionCache.has(`${obj.type}:${obj.id}`);
  };
  const getOverwriteDecision = ({ obj }: FailedImport) => {
    return overwriteDecisionCache.get(`${obj.type}:${obj.id}`);
  };
  const callMapImportFailure = (failure: FailedImport) =>
    mapImportFailureToRetryObject({
      failure,
      overwriteDecisionCache,
      replaceReferencesCache,
      state,
    });
  const isNotSkipped = (failure: FailedImport) => {
    const { type } = failure.error;
    return !RESOLVABLE_ERRORS.includes(type) || getOverwriteDecision(failure)?.retry;
  };

  // Loop until all issues are resolved
  while (importFailures.some((failure) => RESOLVABLE_ERRORS.includes(failure.error.type))) {
    // Resolve regular conflicts
    if (!isOverwriteAllChecked) {
      // prompt the user for each conflict
      const result = await getConflictResolutions(
        importFailures.filter(isConflict).filter(doesntHaveOverwriteDecision)
      );
      for (const key of Object.keys(result)) {
        overwriteDecisionCache.set(key, result[key]);
      }
    } else {
      importFailures.filter(isConflict).forEach(({ obj: { type, id }, error: { destinationId } }) =>
        overwriteDecisionCache.set(`${type}:${id}`, {
          retry: true,
          options: {
            overwrite: true,
            ...(destinationId && { destinationId }),
          },
        })
      );
    }

    // TODO: resolve ambiguous conflicts

    // Build retries array
    const retries = importFailures
      .map(callMapImportFailure)
      .filter((obj) => !!obj) as RetryObject[];
    for (const { error, obj } of importFailures) {
      if (error.type !== 'missing_references') {
        continue;
      }
      if (!retries.some((retryObj) => retryObj.type === obj.type && retryObj.id === obj.id)) {
        continue;
      }
      for (const { type, id } of error.blocking || []) {
        if (!retries.some((r) => r.type === type && r.id === id)) {
          retries.push({ type, id });
        }
      }
    }

    // Scenario where everything is skipped and nothing to retry
    if (retries.length === 0) {
      // Cancelled overwrites aren't failures anymore
      importFailures = importFailures.filter(isNotSkipped);
      break;
    }

    // Call API
    const response = await callResolveImportErrorsApi(http, file, retries);
    successImportCount += response.successCount;
    importFailures = [];
    for (const { error, ...obj } of response.errors || []) {
      importFailures.push({ error, obj });
    }
  }

  return {
    status: 'success',
    importCount: successImportCount,
    failedImports: importFailures,
  };
}
