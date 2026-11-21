/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationLogLevel } from '../types';
import type { BaseState } from './migration_state';
import type * as CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/check_cluster_routing_allocation';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS from './steps/cleanup_unknown_and_excluded_docs';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH from './steps/cleanup_unknown_and_excluded_docs_refresh';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_docs_wait_for_task';
import type * as CREATE_TARGET_INDEX from './steps/create_target_index';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INIT from './steps/init';
import type * as INDEX_STATE_UPDATE_DONE from './steps/index_state_update_done';
import type * as OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX from './steps/outdated_documents_search_bulk_index';
import type * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './steps/outdated_documents_search_open_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import type * as OUTDATED_DOCUMENTS_SEARCH_REFRESH from './steps/outdated_documents_search_refresh';
import type * as OUTDATED_DOCUMENTS_SEARCH_TRANSFORM from './steps/outdated_documents_search_transform';
import type * as UPDATE_ALIASES from './steps/update_aliases';
import type * as UPDATE_DOCUMENT_MODEL_VERSIONS from './steps/update_document_model_versions';
import type * as UPDATE_INDEX_MAPPINGS from './steps/update_index_mappings';
import type * as UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK from './steps/update_index_mappings_wait_for_task';
import type * as UPDATE_MAPPING_MODEL_VERSIONS from './steps/update_mapping_model_versions';
import type * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import type * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';

export type State =
  | INIT.State
  | WAIT_FOR_MIGRATION_COMPLETION.State
  | CHECK_CLUSTER_ROUTING_ALLOCATION.State
  | CREATE_TARGET_INDEX.State
  | WAIT_FOR_YELLOW_SOURCE.State
  | UPDATE_INDEX_MAPPINGS.State
  | UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK.State
  | UPDATE_MAPPING_MODEL_VERSIONS.State
  | UPDATE_ALIASES.State
  | INDEX_STATE_UPDATE_DONE.State
  | CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS.State
  | CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK.State
  | CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH.State
  | OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.State
  | OUTDATED_DOCUMENTS_SEARCH_READ.State
  | OUTDATED_DOCUMENTS_SEARCH_TRANSFORM.State
  | OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX.State
  | OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.State
  | OUTDATED_DOCUMENTS_SEARCH_REFRESH.State
  | UPDATE_DOCUMENT_MODEL_VERSIONS.State
  | DONE.State
  | FATAL.State;

export type StateName = State['controlState'];
export type TerminalState = DONE.State | FATAL.State;
export type NonTerminalState = Exclude<State, TerminalState>;
export type StateOf<TName extends StateName> = Extract<State, { controlState: TName }>;

export const createInitialState = (): INIT.State => ({
  controlState: INIT.Name,
  retryCount: 0,
  pollCount: 0,
  skipRetryReset: false,
  retryDelay: 0,
  logs: [],
});

export const isTerminalState = (state: State): state is TerminalState =>
  state.controlState === DONE.Name || state.controlState === FATAL.Name;

export const appendLog = <TState extends BaseState>(
  state: TState,
  level: MigrationLogLevel,
  message: string
): TState => ({ ...state, logs: [...state.logs, { level, message }] });

/** Clears the retry counters after a successful action, unless the previous transition asked to keep them. */
export const resetRetry = <TState extends BaseState>(state: TState): TState => ({
  ...state,
  retryCount: state.skipRetryReset ? state.retryCount : 0,
  retryDelay: state.skipRetryReset ? state.retryDelay : 0,
  pollCount: 0,
  skipRetryReset: false,
});
