/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsImportResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportFailure,
  SavedObjectsImportSuccess,
  SavedObjectsImportWarning,
} from '@kbn/core/public';

export interface FailedImport {
  obj: Omit<SavedObjectsImportFailure, 'error'>;
  error:
    | SavedObjectsImportConflictError
    | SavedObjectsImportAmbiguousConflictError
    | SavedObjectsImportUnsupportedTypeError
    | SavedObjectsImportMissingReferencesError
    | SavedObjectsImportUnknownError;
}

interface UnmatchedReference {
  existingIndexPatternId: string;
  list: Array<Omit<SavedObjectsImportFailure, 'error'>>;
  newIndexPatternId?: string;
}

export interface ProcessedImportResponse {
  failedImports: FailedImport[];
  successfulImports: SavedObjectsImportSuccess[];
  unmatchedReferences: UnmatchedReference[];
  status: 'success' | 'idle';
  importCount: number;
  importWarnings: SavedObjectsImportWarning[];
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
    importWarnings: response.warnings,
  };
}
