/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as E from 'fp-ts/Either';
import type { PostInitState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, TransformDocsResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { incrementProcessedProgress } from '../../model/progress';
import { createBatches } from '../../model/create_batches';
import { fatalReasonDocumentExceedsMaxBatchSizeBytes } from '../../model/extract_errors';
import type { Step, SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';
import * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './transformed_documents_bulk_index';
import * as FATAL from './fatal';

export const Name = 'OUTDATED_DOCUMENTS_TRANSFORM' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly pitId: string;
  readonly outdatedDocuments: import('@kbn/core-saved-objects-server').SavedObjectsRawDoc[];
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: import('../../core').TransformErrorObjects[];
  readonly progress: import('../../types').Progress;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(state.pitId.length > 0, clause(Name, 'pitId required'));
  assertInvariant(
    state.outdatedDocuments.length > 0,
    clause(Name, 'outdatedDocuments must be non-empty')
  );
};

export const step = (state: State, io: IO): Step<Successors, TransformDocsResponse> => ({
  action: () => io.transformDocs(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        pitId: state.pitId,
        outdatedDocuments: state.outdatedDocuments,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: state.hasTransformedDocs,
        corruptDocumentIds: state.corruptDocumentIds,
        transformErrors: state.transformErrors,
        progress: state.progress,
      });
    }
    const progress = incrementProcessedProgress(state.progress, state.outdatedDocuments.length);
    if (response.type === 'documents_transform_failed' && !state.discardCorruptObjects) {
      return transitionTo(state, OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
        pitId: state.pitId,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: false,
        corruptDocumentIds: [...state.corruptDocumentIds, ...response.corruptDocumentIds],
        transformErrors: [...state.transformErrors, ...response.transformErrors],
        progress,
      });
    }
    const documents =
      response.type === 'transformed' ? response.processedDocs : response.processedDocs;
    const corruptDocumentIds =
      response.type === 'documents_transform_failed'
        ? [...state.corruptDocumentIds, ...response.corruptDocumentIds]
        : state.corruptDocumentIds;
    const transformErrors =
      response.type === 'documents_transform_failed'
        ? [...state.transformErrors, ...response.transformErrors]
        : state.transformErrors;
    const batches = createBatches({
      documents,
      corruptDocumentIds,
      transformErrors,
      maxBatchSizeBytes: state.maxBatchSizeBytes,
    });
    if (E.isLeft(batches)) {
      return transitionTo(state, FATAL.Name, {
        reason: fatalReasonDocumentExceedsMaxBatchSizeBytes({
          _id: batches.left.documentId,
          docSizeBytes: batches.left.docSizeBytes,
          maxBatchSizeBytes: batches.left.maxBatchSizeBytes,
        }),
      });
    }
    return transitionTo(
      { ...state, hasTransformedDocs: true, progress },
      TRANSFORMED_DOCUMENTS_BULK_INDEX.Name,
      {
        bulkOperationBatches: batches.right,
        currentBatch: 0,
      }
    );
  },
});
