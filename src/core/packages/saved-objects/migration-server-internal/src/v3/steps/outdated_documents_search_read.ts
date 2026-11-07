/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  extractDiscardedCorruptDocs,
  extractTransformFailuresReason,
} from '../../model/extract_errors';
import { logProgress, setProgressTotal } from '../../model/progress';
import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { PitState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './outdated_documents_search_close_pit';
import * as OUTDATED_DOCUMENTS_SEARCH_TRANSFORM from './outdated_documents_search_transform';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_READ' as const;

/** Reads the next batch of outdated documents. */
export interface State extends PitState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

/** All outdated documents have been read: fail if some could not be converted, unless they may be discarded. */
const finish = (state: State, context: MigrationContext): StateOf<Successors> => {
  const { corruptDocumentIds, transformErrors } = state;
  if (corruptDocumentIds.length === 0 && transformErrors.length === 0) {
    return { ...state, controlState: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name };
  }
  if (!context.discardCorruptObjects) {
    return fail(
      state,
      extractTransformFailuresReason(
        context.migrationDocLinks.resolveMigrationFailures,
        corruptDocumentIds,
        transformErrors
      )
    );
  }
  return {
    ...appendLog(
      state,
      'warning',
      extractDiscardedCorruptDocs(corruptDocumentIds, transformErrors)
    ),
    controlState: OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.Name,
  };
};

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'readWithPit'>> => ({
  action: () => io.readWithPit(state.pitId, state.lastHitSortValue, state.batchSize),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'es_response_too_large': {
        if (state.batchSize === 1) {
          return fail(
            state,
            `After reducing the read batch size to a single document, the response content length was ${response.contentLength} bytes which still exceeded the Elasticsearch client maximum response size.`
          );
        }
        const batchSize = Math.max(Math.floor(state.batchSize / 2), 1);
        return {
          ...appendLog(
            state,
            'warning',
            `Read a batch with a response content length of ${response.contentLength} bytes which exceeds the Elasticsearch client maximum response size, retrying by reducing the batch size in half to ${batchSize}.`
          ),
          batchSize,
        };
      }
      case 'success': {
        const { outdatedDocuments, pitId, lastHitSortValue, totalHits } = response.value;
        const next = { ...resetRetry(state), pitId };
        if (outdatedDocuments.length === 0) {
          return finish(next, context);
        }
        const progress = setProgressTotal(state.progress, totalHits);
        return {
          ...next,
          controlState: OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.Name,
          outdatedDocuments,
          lastHitSortValue,
          progress,
          logs: logProgress(next.logs, progress),
        };
      }
      default:
        return assertNever(response);
    }
  },
});
