/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { fail, retry, poll } from '../retry';
import { appendLog, resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS from './cleanup_unknown_and_excluded_docs';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH from './cleanup_unknown_and_excluded_docs_refresh';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';

export const Name = 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK' as const;

/** Waits for the delete-by-query task of the cleanup. */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
  readonly deleteTaskId: string;
  readonly hasDeletedDocs: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'waitForDeleteByQueryTask'>> => ({
  action: () => io.waitForDeleteByQueryTask(state.deleteTaskId),
  transition: (response): StateOf<Successors> => {
    const { deleteTaskId, hasDeletedDocs, ...rest } = state;
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'wait_for_task_completion_timeout':
        // the task is still running: keep polling
        return poll(state, response.message);
      case 'cleanup_failed': {
        // version conflicts: another instance is probably updating documents, run the cleanup again
        if (state.retryCount < context.maxRetryAttempts) {
          const retryCount = state.retryCount + 1;
          return {
            ...appendLog(
              rest,
              'warning',
              `Errors occurred whilst deleting unwanted documents. Retrying attempt ${retryCount}.`
            ),
            controlState: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.Name,
            hasDeletedDocs: true,
            retryCount,
            retryDelay: 1500 + 1000 * Math.random(),
            skipRetryReset: true,
          };
        }
        const failures = response.failures.map((failure) => `- ${failure}\n`).join('');
        return fail(
          state,
          `Migration failed because it was unable to delete unwanted documents from the ${
            state.currentIndex
          } system index (${response.failures.length} failures and ${
            response.versionConflicts ?? 0
          } conflicts)${failures ? `:\n${failures}` : ''}`
        );
      }
      case 'success': {
        const { deleted } = response.value;
        const mustRefresh = hasDeletedDocs || deleted === undefined || deleted > 0;
        return mustRefresh
          ? { ...resetRetry(rest), controlState: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name }
          : { ...resetRetry(rest), controlState: OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name };
      }
      default:
        return assertNever(response);
    }
  },
});
