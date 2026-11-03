/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from './context';
import { isTerminalState, type State, type StateName } from './state';
import { SUCCESSORS } from './successors';
import * as OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX from './steps/outdated_documents_search_bulk_index';
import * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_docs_wait_for_task';
import * as UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK from './steps/update_index_mappings_wait_for_task';
import * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';

export class MigrationInvariantViolation extends Error {
  constructor(message: string) {
    super(`Invalid v3 migration state: ${message}`);
    this.name = 'MigrationInvariantViolation';
  }
}

const check = (condition: boolean, state: State, claim: string): void => {
  if (!condition) {
    throw new MigrationInvariantViolation(`${state.controlState}: ${claim}`);
  }
};

/** States that poll without a retry budget. */
const UNBOUNDED_RETRY_STATES: ReadonlySet<StateName> = new Set<StateName>([
  WAIT_FOR_MIGRATION_COMPLETION.Name,
  UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.Name,
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.Name,
  OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.Name,
]);

/** Checks the invariants that must hold in every state. Throws a {@link MigrationInvariantViolation} otherwise. */
export const assertInvariants = (state: State, context: MigrationContext): void => {
  check(state.controlState in SUCCESSORS, state, 'unknown state');
  check(Number.isInteger(state.retryCount) && state.retryCount >= 0, state, 'invalid retryCount');
  check(state.retryDelay >= 0, state, 'invalid retryDelay');
  check(
    isTerminalState(state) ||
      UNBOUNDED_RETRY_STATES.has(state.controlState) ||
      state.retryCount <= context.maxRetryAttempts,
    state,
    'retryCount exceeds the retry budget'
  );
  if ('currentIndex' in state) {
    check(
      state.currentIndex.startsWith(`${context.indexPrefix}_`),
      state,
      `currentIndex must belong to the ${context.indexPrefix} prefix`
    );
  }
  if ('batchSize' in state) {
    check(Number.isInteger(state.batchSize) && state.batchSize >= 1, state, 'invalid batchSize');
  }
  if ('bulkOperationBatches' in state) {
    check(
      state.currentBatch >= 0 && state.currentBatch < state.bulkOperationBatches.length,
      state,
      'currentBatch out of bounds'
    );
  }
};

/** Checks that `to` is a legal successor of `from`. */
export const assertLegalTransition = (from: State, to: State): void => {
  const successors: readonly StateName[] = SUCCESSORS[from.controlState];
  check(successors.includes(to.controlState), from, `illegal transition to ${to.controlState}`);
};
