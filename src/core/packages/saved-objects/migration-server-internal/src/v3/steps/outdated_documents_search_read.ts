/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import { assertInvariant, clause } from '../invariant_helper';
import type { IO, ReadWithPitResponse } from '../io';
import { resetRetry, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { setProgressTotal, logProgress } from '../../model/progress';
import { increaseBatchSize } from '../../model/helpers';
import type { OutdatedDocumentsSearchRead } from '../../state';
import { extractTransformFailuresReason } from '../../model/extract_errors';
import type { Step, SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';
import * as OUTDATED_DOCUMENTS_TRANSFORM from './outdated_documents_transform';
import * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './outdated_documents_search_close_pit';
import * as FATAL from './fatal';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_READ' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly pitId: string;
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: import('../../core').TransformErrorObjects[];
  readonly progress: import('../../types').Progress;
}

type Successors = SuccessorsOf<typeof Name>;

export const assertInvariants = (state: State): void => {
  assertInvariant(state.pitId.length > 0, clause(Name, 'pitId required'));
  if (state.progress.total !== undefined && state.progress.processed !== undefined) {
    assertInvariant(
      state.progress.processed <= state.progress.total,
      clause(Name, 'progress.processed must not exceed progress.total')
    );
  }
};

export const step = (state: State, io: IO): Step<Successors, ReadWithPitResponse> => ({
  action: () => io.readWithPit(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        pitId: state.pitId,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: state.hasTransformedDocs,
        corruptDocumentIds: state.corruptDocumentIds,
        transformErrors: state.transformErrors,
        progress: state.progress,
      });
    }
    if (response.type === 'es_response_too_large') {
      if (state.batchSize === 1) {
        return transitionTo(state, FATAL.Name, {
          reason: `After reducing the read batch size to a single document, the response content length was ${response.contentLength} bytes which still exceeded migrations.maxReadBatchSizeBytes. Increase migrations.maxReadBatchSizeBytes and try again.`,
        });
      }
      const batchSize = Math.max(Math.floor(state.batchSize / 2), 1);
      return transitionTo({ ...state, batchSize }, OUTDATED_DOCUMENTS_SEARCH_READ.Name, {
        pitId: state.pitId,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: state.hasTransformedDocs,
        corruptDocumentIds: state.corruptDocumentIds,
        transformErrors: state.transformErrors,
        progress: state.progress,
      });
    }
    if (response.type === 'hits') {
      const progress = setProgressTotal(state.progress, response.totalHits);
      const logs = logProgress(state.logs, progress);
      return transitionTo(
        {
          ...state,
          batchSize: increaseBatchSize(state as unknown as OutdatedDocumentsSearchRead),
          logs,
          progress,
        },
        OUTDATED_DOCUMENTS_TRANSFORM.Name,
        {
          outdatedDocuments: response.outdatedDocuments,
        }
      );
    }
    // no outdated docs
    if (state.corruptDocumentIds.length > 0 || state.transformErrors.length > 0) {
      if (!state.discardCorruptObjects) {
        const reason = extractTransformFailuresReason(
          state.migrationDocLinks.resolveMigrationFailures,
          state.corruptDocumentIds,
          state.transformErrors
        );
        return transitionTo(state, FATAL.Name, { reason });
      }
    }
    return transitionTo(resetRetry(state), OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name, {
      pitId: response.pitId,
      hasTransformedDocs: state.hasTransformedDocs,
    });
  },
});
