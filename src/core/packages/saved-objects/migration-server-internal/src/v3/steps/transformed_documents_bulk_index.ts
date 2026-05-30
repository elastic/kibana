/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PostInitState } from '../migration_state';
import type { IO, BulkIndexResponse } from '../io';
import { transitionTo } from '../state';
import { handleRetryableFailure, delayRetryTransition } from '../retry';
import { FATAL_REASON_REQUEST_ENTITY_TOO_LARGE } from '../../common/constants';
import type { Step, SuccessorsOf } from '../types';
import * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './transformed_documents_bulk_index';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';
import * as FATAL from './fatal';

export const Name = 'TRANSFORMED_DOCUMENTS_BULK_INDEX' as const;

export interface State extends PostInitState {
  readonly name: typeof Name;
  readonly bulkOperationBatches: import('../../model/create_batches').BulkOperation[][];
  readonly currentBatch: number;
  readonly pitId: string;
  readonly lastHitSortValue: number[] | undefined;
  readonly hasTransformedDocs: boolean;
  readonly progress: import('../../types').Progress;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (state: State, io: IO): Step<Successors, BulkIndexResponse> => ({
  action: () => io.bulkIndex(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {
        bulkOperationBatches: state.bulkOperationBatches,
        currentBatch: state.currentBatch,
        pitId: state.pitId,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: state.hasTransformedDocs,
        progress: state.progress,
      });
    }
    if (response.type === 'request_entity_too_large_exception') {
      return transitionTo(state, FATAL.Name, { reason: FATAL_REASON_REQUEST_ENTITY_TOO_LARGE });
    }
    if (response.type === 'unavailable_shards_exception') {
      return delayRetryTransition<typeof Name>(state, response.message, Number.MAX_SAFE_INTEGER, {
        bulkOperationBatches: state.bulkOperationBatches,
        currentBatch: state.currentBatch,
        pitId: state.pitId,
        lastHitSortValue: state.lastHitSortValue,
        hasTransformedDocs: state.hasTransformedDocs,
        progress: state.progress,
      });
    }
    if (state.currentBatch + 1 < state.bulkOperationBatches.length) {
      return transitionTo(state, TRANSFORMED_DOCUMENTS_BULK_INDEX.Name, {
        currentBatch: state.currentBatch + 1,
      });
    }
    return transitionTo(
      { ...state, hasTransformedDocs: true, corruptDocumentIds: [], transformErrors: [] },
      OUTDATED_DOCUMENTS_SEARCH_READ.Name,
      {}
    );
  },
});
