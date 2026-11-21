/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { countBy } from 'lodash';
import type { DocumentIdAndType } from '../../actions/check_for_unknown_docs';
import { extractDiscardedUnknownDocs } from '../../model/extract_errors';
import type { MigrationLog } from '../../types';
import type { MigrationContext } from '../context';
import type { CleanupResult, IO, IOResponse } from '../io';
import type { ExistingIndexState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH from './cleanup_unknown_and_excluded_docs_refresh';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK from './cleanup_unknown_and_excluded_docs_wait_for_task';
import * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './outdated_documents_search_open_pit';

export const Name = 'CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS' as const;

/**
 * Deletes the documents of removed types and those excluded by `excludeOnUpgrade` hooks.
 * Documents of unknown types are deleted if `migrations.discardUnknownObjects` is enabled, and kept otherwise.
 */
export interface State extends ExistingIndexState {
  readonly controlState: typeof Name;
  /** Whether a previous attempt already deleted documents. */
  readonly hasDeletedDocs?: boolean;
}

type Successors = SuccessorsOf<typeof Name>;

const keptUnknownDocsMessage = (index: string, unknownDocs: DocumentIdAndType[]): string => {
  const types = Object.entries(countBy(unknownDocs, ({ type }) => type))
    .map(([type, count]) => `${type} (${count})`)
    .join(', ');
  return (
    `The ${index} index contains documents of unknown types, which have been kept: ${types}. ` +
    `They are not available in Kibana. Set 'migrations.discardUnknownObjects' to discard them.`
  );
};

const getLogs = (
  context: MigrationContext,
  index: string,
  { cleanup, unknownDocs }: CleanupResult
): MigrationLog[] => [
  ...(unknownDocs.length > 0
    ? [
        {
          level: 'warning' as const,
          message: context.discardUnknownObjects
            ? extractDiscardedUnknownDocs(unknownDocs)
            : keptUnknownDocsMessage(index, unknownDocs),
        },
      ]
    : []),
  ...(cleanup.type === 'cleanup_started'
    ? Object.entries(cleanup.errorsByType).map(([type, error]) => ({
        level: 'warning' as const,
        message: `Ignored excludeOnUpgrade hook on type [${type}] that failed with error: "${error.toString()}"`,
      }))
    : []),
];

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'cleanupUnknownAndExcludedDocs'>> => ({
  action: () => io.cleanupUnknownAndExcludedDocs(state.currentIndex, context.discardUnknownObjects),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success': {
        const { hasDeletedDocs = false, ...rest } = resetRetry(state);
        const next = {
          ...rest,
          logs: [...rest.logs, ...getLogs(context, state.currentIndex, response.value)],
        };
        const { cleanup } = response.value;
        if (cleanup.type === 'cleanup_started') {
          return {
            ...next,
            controlState: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name,
            deleteTaskId: cleanup.taskId,
            hasDeletedDocs,
          };
        }
        // documents deleted by a previous attempt must become invisible to the search
        return hasDeletedDocs
          ? { ...next, controlState: CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.Name }
          : { ...next, controlState: OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.Name };
      }
      default:
        return assertNever(response);
    }
  },
});
