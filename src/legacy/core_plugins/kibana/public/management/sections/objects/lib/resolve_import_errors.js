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

import { kfetch } from 'ui/kfetch';

async function callResolveImportErrorsApi(file, retries) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('retries', JSON.stringify(retries));
  return await kfetch({
    method: 'POST',
    pathname: '/api/saved_objects/_resolve_import_errors',
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
}) {
  const { isOverwriteAllChecked, unmatchedReferences } = state;
  const isOverwriteGranted =
    isOverwriteAllChecked ||
    overwriteDecisionCache.get(`${failure.obj.type}:${failure.obj.id}`) === true;

  // Conflicts wihtout overwrite granted are skipped
  if (!isOverwriteGranted && failure.error.type === 'conflict') {
    return;
  }

  // Replace references if user chose a new reference
  if (failure.error.type === 'missing_references') {
    const objReplaceReferences =
      replaceReferencesCache.get(`${failure.obj.type}:${failure.obj.id}`) || [];
    const indexPatternRefs = failure.error.references.filter(obj => obj.type === 'index-pattern');
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
    overwrite:
      isOverwriteAllChecked ||
      overwriteDecisionCache.get(`${failure.obj.type}:${failure.obj.id}`) === true,
    replaceReferences: replaceReferencesCache.get(`${failure.obj.type}:${failure.obj.id}`) || [],
  };
}

export async function resolveImportErrors({ getConflictResolutions, state }) {
  const overwriteDecisionCache = new Map();
  const replaceReferencesCache = new Map();
  let { importCount: successImportCount, failedImports: importFailures = [] } = state;
  const { file, isOverwriteAllChecked } = state;

  const doesntHaveOverwriteDecision = ({ obj }) => {
    return !overwriteDecisionCache.has(`${obj.type}:${obj.id}`);
  };
  const getOverwriteDecision = ({ obj }) => {
    return overwriteDecisionCache.get(`${obj.type}:${obj.id}`);
  };
  const callMapImportFailure = failure => {
    return mapImportFailureToRetryObject({
      failure,
      overwriteDecisionCache,
      replaceReferencesCache,
      state,
    });
  };
  const isNotSkipped = failure => {
    return (
      (failure.error.type !== 'conflict' && failure.error.type !== 'missing_references') ||
      getOverwriteDecision(failure)
    );
  };

  // Loop until all issues are resolved
  while (
    importFailures.some(failure => ['conflict', 'missing_references'].includes(failure.error.type))
  ) {
    // Ask for overwrites
    if (!isOverwriteAllChecked) {
      const result = await getConflictResolutions(
        importFailures
          .filter(({ error }) => error.type === 'conflict')
          .filter(doesntHaveOverwriteDecision)
          .map(({ obj }) => obj)
      );
      for (const key of Object.keys(result)) {
        overwriteDecisionCache.set(key, result[key]);
      }
    }

    // Build retries array
    const retries = importFailures.map(callMapImportFailure).filter(obj => !!obj);
    for (const { error, obj } of importFailures) {
      if (error.type !== 'missing_references') {
        continue;
      }
      if (!retries.some(retryObj => retryObj.type === obj.type && retryObj.id === obj.id)) {
        continue;
      }
      for (const { type, id } of error.blocking || []) {
        retries.push({ type, id });
      }
    }

    // Scenario where everything is skipped and nothing to retry
    if (retries.length === 0) {
      // Cancelled overwrites aren't failures anymore
      importFailures = importFailures.filter(isNotSkipped);
      break;
    }

    // Call API
    const response = await callResolveImportErrorsApi(file, retries);
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
