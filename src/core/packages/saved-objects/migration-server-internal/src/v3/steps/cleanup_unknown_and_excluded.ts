/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SourceExistsState } from '../migration_state';
import type { IO, CleanupUnknownAndExcludedResponse } from '../io';
import { appendLogLevel, transitionTo } from '../state';
import { handleRetryableFailure } from '../retry';
import { extractDiscardedUnknownDocs } from '../../model/extract_errors';
import type { Step, SuccessorsOf } from '../types';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './cleanup_unknown_and_excluded_wait_for_task';
import * as PREPARE_COMPATIBLE_MIGRATION from './prepare_compatible_migration';
import * as FATAL from './fatal';

export const Name = 'CLEANUP_UNKNOWN_AND_EXCLUDED' as const;

export interface State extends SourceExistsState {
  readonly name: typeof Name;
  readonly mustRefresh?: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO
): Step<Successors, CleanupUnknownAndExcludedResponse> => ({
  action: () => io.cleanupUnknownAndExcluded(state),
  transition: (response) => {
    if (response.type === 'retryable_failure') {
      return handleRetryableFailure<typeof Name>(state, response, {});
    }
    if (response.type === 'unknown_docs_found') {
      return transitionTo(
        appendLogLevel(state, { level: 'error', message: response.reason }),
        FATAL.Name,
        {
          reason: response.reason,
        }
      );
    }
    if (response.type === 'cleanup_started') {
      let logs = state.logs;
      if (response.unknownDocs.length) {
        logs = [
          ...logs,
          { level: 'warning', message: extractDiscardedUnknownDocs(response.unknownDocs) },
        ];
      }
      logs = [
        ...logs,
        ...Object.entries(response.errorsByType).map(([soType, error]) => ({
          level: 'warning' as const,
          message: `Ignored excludeOnUpgrade hook on type [${soType}] that failed with error: "${error.toString()}"`,
        })),
      ];
      return transitionTo({ ...state, logs }, CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.Name, {
        deleteByQueryTaskId: response.taskId,
      });
    }
    return transitionTo(state, PREPARE_COMPATIBLE_MIGRATION.Name, response.preTransform);
  },
});
