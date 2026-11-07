/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FATAL_REASON_REQUEST_ENTITY_TOO_LARGE } from '../../common/constants';
import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { BulkIndexState } from '../migration_state';
import { fail, retry, poll } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_READ from './outdated_documents_search_read';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX' as const;

/** Writes the converted documents, one bulk request at a time. */
export interface State extends BulkIndexState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'bulkIndex'>> => ({
  action: () =>
    io.bulkIndex(
      state.currentIndex,
      state.bulkOperationBatches[state.currentBatch],
      // explaining the allocation is expensive: only do it on the first attempt
      context.fetchAllocationExplain && state.retryCount === 0 && state.pollCount === 0
    ),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'unavailable_shards_exception':
        return poll(state, response.message);
      case 'request_entity_too_large_exception':
        return fail(state, FATAL_REASON_REQUEST_ENTITY_TOO_LARGE);
      case 'target_index_had_write_block':
        return fail(state, `The ${state.currentIndex} index has a write block.`);
      case 'index_not_found_exception':
        return fail(state, `The ${state.currentIndex} index was deleted during the migration.`);
      case 'success': {
        if (state.currentBatch + 1 < state.bulkOperationBatches.length) {
          return { ...resetRetry(state), currentBatch: state.currentBatch + 1 };
        }
        const { bulkOperationBatches, currentBatch, ...rest } = resetRetry(state);
        return {
          ...rest,
          controlState: OUTDATED_DOCUMENTS_SEARCH_READ.Name,
          corruptDocumentIds: [],
          transformErrors: [],
        };
      }
      default:
        return assertNever(response);
    }
  },
});
