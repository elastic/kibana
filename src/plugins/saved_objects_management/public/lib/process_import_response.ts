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
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportError,
  SavedObjectsImportSuccess,
} from 'src/core/public';

export interface FailedImport {
  obj: Omit<SavedObjectsImportError, 'error'>;
  error:
    | SavedObjectsImportConflictError
    | SavedObjectsImportAmbiguousConflictError
    | SavedObjectsImportUnsupportedTypeError
    | SavedObjectsImportMissingReferencesError
    | SavedObjectsImportUnknownError;
}

interface UnmatchedReference {
  existingIndexPatternId: string;
  list: Array<Omit<SavedObjectsImportError, 'error'>>;
  newIndexPatternId?: string;
}

export interface ProcessedImportResponse {
  failedImports: FailedImport[];
  successfulImports: SavedObjectsImportSuccess[];
  unmatchedReferences: UnmatchedReference[];
  status: 'success' | 'idle';
  importCount: number;
  conflictedSavedObjectsLinkedToSavedSearches: undefined;
  conflictedSearchDocs: undefined;
}

const isAnyConflict = ({ type }: FailedImport['error']) =>
  type === 'conflict' || type === 'ambiguous_conflict';

export function processImportResponse(
  response: SavedObjectsImportResponse
): ProcessedImportResponse {
  // Go through the failures and split between unmatchedReferences and failedImports
  const failedImports = [];
  const unmatchedReferences = new Map<string, UnmatchedReference>();
  for (const { error, ...obj } of response.errors || []) {
    failedImports.push({ obj, error });
    if (error.type !== 'missing_references') {
      continue;
    }
    // Currently only supports resolving references on index patterns
    const indexPatternRefs = error.references.filter((ref) => ref.type === 'index-pattern');
    for (const missingReference of indexPatternRefs) {
      const conflict = unmatchedReferences.get(
        `${missingReference.type}:${missingReference.id}`
      ) || {
        existingIndexPatternId: missingReference.id,
        list: [],
        newIndexPatternId: undefined,
      };
      if (!conflict.list.some(({ type, id }) => type === obj.type && id === obj.id)) {
        conflict.list.push(obj);
        unmatchedReferences.set(`${missingReference.type}:${missingReference.id}`, conflict);
      }
    }
  }

  return {
    failedImports,
    successfulImports: response.successResults ?? [],
    unmatchedReferences: Array.from(unmatchedReferences.values()),
    // Import won't be successful in the scenario unmatched references exist, import API returned errors of type unknown or import API
    // returned errors of type missing_references.
    status:
      unmatchedReferences.size === 0 && !failedImports.some((issue) => isAnyConflict(issue.error))
        ? 'success'
        : 'idle',
    importCount: response.successCount,
    conflictedSavedObjectsLinkedToSavedSearches: undefined,
    conflictedSearchDocs: undefined,
  };
}
