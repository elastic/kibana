/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Either from 'fp-ts/Either';
import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { createBatches } from '../../model/create_batches';
import {
  extractDiscardedCorruptDocs,
  fatalReasonDocumentExceedsMaxBatchSizeBytes,
} from '../../model/extract_errors';
import { incrementProcessedProgress } from '../../model/progress';
import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { TransformState } from '../migration_state';
import { fail } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX from './outdated_documents_search_bulk_index';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_TRANSFORM' as const;

/** Converts a batch of outdated documents to the latest model version. */
export interface State extends TransformState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

/** Splits the converted documents (and the deletion of the discarded ones) into bulk requests. */
const toBulkIndex = (
  state: Omit<State, 'outdatedDocuments'>,
  documents: SavedObjectsRawDoc[],
  context: MigrationContext
): StateOf<Successors> => {
  const batches = createBatches({
    documents,
    corruptDocumentIds: state.corruptDocumentIds,
    transformErrors: state.transformErrors,
    maxBatchSizeBytes: context.maxBatchSizeBytes,
  });
  if (Either.isLeft(batches)) {
    return fail(
      state,
      fatalReasonDocumentExceedsMaxBatchSizeBytes({
        _id: batches.left.documentId,
        docSizeBytes: batches.left.docSizeBytes,
        maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
      })
    );
  }
  return {
    ...state,
    controlState: OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name,
    bulkOperationBatches: batches.right,
    currentBatch: 0,
    hasTransformedDocs: true,
  };
};

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'transformDocs'>> => ({
  action: () => io.transformDocs(state.outdatedDocuments),
  transition: (response): StateOf<Successors> => {
    // documents count as processed whatever the result, otherwise progress looks off when there are errors
    const { outdatedDocuments, ...rest } = resetRetry(state);
    const next = {
      ...rest,
      progress: incrementProcessedProgress(state.progress, outdatedDocuments.length),
    };
    const hasFailures = state.corruptDocumentIds.length > 0 || state.transformErrors.length > 0;

    switch (response.type) {
      case 'success':
        // once a document failed, the migration fails: stop writing, but keep collecting the failures
        return hasFailures && !context.discardCorruptObjects
          ? { ...next, controlState: OUTDATED_DOCUMENTS_SEARCH_READ.Name }
          : toBulkIndex(next, response.value.processedDocs, context);
      case 'documents_transform_failed': {
        const withFailures = {
          ...next,
          corruptDocumentIds: [...next.corruptDocumentIds, ...response.corruptDocumentIds],
          transformErrors: [...next.transformErrors, ...response.transformErrors],
        };
        return context.discardCorruptObjects
          ? toBulkIndex(
              appendLog(
                withFailures,
                'warning',
                extractDiscardedCorruptDocs(response.corruptDocumentIds, response.transformErrors)
              ),
              response.processedDocs,
              context
            )
          : { ...withFailures, controlState: OUTDATED_DOCUMENTS_SEARCH_READ.Name };
      }
      default:
        return assertNever(response);
    }
  },
});
