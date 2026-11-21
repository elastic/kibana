/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import { evaluateIndex } from '../evaluate_index';
import type { IO, IOResponse } from '../io';
import type { BaseState } from '../migration_state';
import { fail, retry } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as DONE from './done';

export const Name = 'WAIT_FOR_MIGRATION_COMPLETION' as const;

/** Delay between two checks of whether another instance completed the migration. */
export const WAIT_FOR_MIGRATION_COMPLETION_DELAY_MS = 2000;

/** Polls the index until another instance has completed its migration. */
export interface State extends BaseState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'fetchIndices'>> => ({
  action: io.fetchIndices,
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success': {
        const evaluation = evaluateIndex(context, response.value);
        switch (evaluation.type) {
          case 'fatal':
            return fail(state, evaluation.reason);
          case 'update':
            return {
              ...appendLog(
                resetRetry(state),
                'info',
                'Another Kibana instance completed the migration.'
              ),
              controlState: DONE.Name,
              currentIndex: evaluation.currentIndex,
            };
          case 'wait':
          case 'create':
            return { ...resetRetry(state), retryDelay: WAIT_FOR_MIGRATION_COMPLETION_DELAY_MS };
          default:
            return assertNever(evaluation);
        }
      }
      default:
        return assertNever(response);
    }
  },
});
