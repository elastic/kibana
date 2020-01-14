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
  SavedObjectsImportResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportError,
} from 'src/core/public';

export interface ProcessedImportResponse {
  failedImports: Array<{
    obj: Pick<SavedObjectsImportError, 'id' | 'type' | 'title'>;
    error:
      | SavedObjectsImportConflictError
      | SavedObjectsImportUnsupportedTypeError
      | SavedObjectsImportMissingReferencesError
      | SavedObjectsImportUnknownError;
  }>;
  unmatchedReferences: Array<{
    existingIndexPatternId: string;
    list: Array<Record<string, any>>;
    newIndexPatternId: string | undefined;
  }>;
  status: 'success' | 'idle';
  importCount: number;
  conflictedSavedObjectsLinkedToSavedSearches: undefined;
  conflictedSearchDocs: undefined;
}

export function processImportResponse(
  response: SavedObjectsImportResponse
): ProcessedImportResponse {
  // Go through the failures and split between unmatchedReferences and failedImports
  const failedImports = [];
  const unmatchedReferences = new Map();
  for (const { error, ...obj } of response.errors || []) {
    failedImports.push({ obj, error });
    if (error.type !== 'missing_references') {
      continue;
    }
    // Currently only supports resolving references on index patterns
    const indexPatternRefs = error.references.filter(ref => ref.type === 'index-pattern');
    for (const missingReference of indexPatternRefs) {
      const conflict = unmatchedReferences.get(
        `${missingReference.type}:${missingReference.id}`
      ) || {
        existingIndexPatternId: missingReference.id,
        list: [],
        newIndexPatternId: undefined,
      };
      conflict.list.push(obj);
      unmatchedReferences.set(`${missingReference.type}:${missingReference.id}`, conflict);
    }
  }

  return {
    failedImports,
    unmatchedReferences: Array.from(unmatchedReferences.values()),
    // Import won't be successful in the scenario unmatched references exist, import API returned errors of type unknown or import API
    // returned errors of type missing_references.
    status:
      unmatchedReferences.size === 0 &&
      !failedImports.some(issue => issue.error.type === 'conflict')
        ? 'success'
        : 'idle',
    importCount: response.successCount,
    conflictedSavedObjectsLinkedToSavedSearches: undefined,
    conflictedSearchDocs: undefined,
  };
}
