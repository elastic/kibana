/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationLog } from '../types';
import type { BaseState, MigrationBaseState, PostInitState } from './migration_state';
export type {
  BaseState,
  MigrationBaseState,
  PostInitState,
  PostInitFields,
  SourceExistsState,
} from './migration_state';

import type * as CHECK_TARGET_MAPPINGS from './steps/check_target_mappings';
import type * as CHECK_VERSION_INDEX_READY_ACTIONS from './steps/check_version_index_ready_actions';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED from './steps/cleanup_unknown_and_excluded';
import type * as CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK from './steps/cleanup_unknown_and_excluded_wait_for_task';
import type * as COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/compatible_update_check_cluster_routing_allocation';
import type * as CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION from './steps/create_index_check_cluster_routing_allocation';
import type * as CREATE_NEW_TARGET from './steps/create_new_target';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import { Name as InitName, type State as InitState } from './steps/init';
import type * as MARK_VERSION_INDEX_READY from './steps/mark_version_index_ready';
import type * as MARK_VERSION_INDEX_READY_CONFLICT from './steps/mark_version_index_ready_conflict';
import type * as OUTDATED_DOCUMENTS_REFRESH from './steps/outdated_documents_refresh';
import type * as OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT from './steps/outdated_documents_search_close_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT from './steps/outdated_documents_search_open_pit';
import type * as OUTDATED_DOCUMENTS_SEARCH_READ from './steps/outdated_documents_search_read';
import type * as OUTDATED_DOCUMENTS_TRANSFORM from './steps/outdated_documents_transform';
import type * as PREPARE_COMPATIBLE_MIGRATION from './steps/prepare_compatible_migration';
import type * as REFRESH_SOURCE from './steps/refresh_source';
import type * as TRANSFORMED_DOCUMENTS_BULK_INDEX from './steps/transformed_documents_bulk_index';
import type * as UPDATE_SOURCE_MAPPINGS_PROPERTIES from './steps/update_source_mappings_properties';
import type * as UPDATE_TARGET_MAPPINGS_META from './steps/update_target_mappings_meta';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES from './steps/update_target_mappings_properties';
import type * as UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK from './steps/update_target_mappings_properties_wait_for_task';
import type * as WAIT_FOR_MIGRATION_COMPLETION from './steps/wait_for_migration_completion';
import type * as WAIT_FOR_YELLOW_SOURCE from './steps/wait_for_yellow_source';

export type State =
  | InitState
  | WAIT_FOR_MIGRATION_COMPLETION.State
  | WAIT_FOR_YELLOW_SOURCE.State
  | UPDATE_SOURCE_MAPPINGS_PROPERTIES.State
  | COMPATIBLE_UPDATE_CHECK_CLUSTER_ROUTING_ALLOCATION.State
  | CLEANUP_UNKNOWN_AND_EXCLUDED.State
  | CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK.State
  | PREPARE_COMPATIBLE_MIGRATION.State
  | REFRESH_SOURCE.State
  | CREATE_INDEX_CHECK_CLUSTER_ROUTING_ALLOCATION.State
  | CREATE_NEW_TARGET.State
  | CHECK_TARGET_MAPPINGS.State
  | UPDATE_TARGET_MAPPINGS_PROPERTIES.State
  | UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK.State
  | UPDATE_TARGET_MAPPINGS_META.State
  | CHECK_VERSION_INDEX_READY_ACTIONS.State
  | OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT.State
  | OUTDATED_DOCUMENTS_SEARCH_READ.State
  | OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT.State
  | OUTDATED_DOCUMENTS_REFRESH.State
  | OUTDATED_DOCUMENTS_TRANSFORM.State
  | TRANSFORMED_DOCUMENTS_BULK_INDEX.State
  | MARK_VERSION_INDEX_READY.State
  | MARK_VERSION_INDEX_READY_CONFLICT.State
  | DONE.State
  | FATAL.State;

export type StateName = State['name'];
export type NonTerminalState = Exclude<State, DONE.State | FATAL.State>;
export type TerminalState = DONE.State | FATAL.State;
export type StateOf<TName extends StateName> = Extract<State, { name: TName }>;

export const createInitialState = (params: Omit<InitState, 'name'>): InitState => ({
  name: InitName,
  ...params,
});

export type TransitionExtras<
  TFrom extends MigrationBaseState | PostInitState,
  TTo extends StateName
> = Omit<StateOf<TTo>, keyof TFrom | 'name'>;

export const isTerminalState = (state: State): state is TerminalState =>
  state.name === DONE.Name || state.name === FATAL.Name;

export const appendLog = <TState extends BaseState>(state: TState, message: string): TState => ({
  ...state,
  logs: [...state.logs, { level: 'info' as const, message }],
});

export const appendLogLevel = <TState extends BaseState>(
  state: TState,
  log: MigrationLog
): TState => ({
  ...state,
  logs: [...state.logs, log],
});

export const resetRetry = <TState extends BaseState>(state: TState): TState => ({
  ...state,
  retryCount: state.skipRetryReset ? state.retryCount : 0,
  retryDelay: state.skipRetryReset ? state.retryDelay : 0,
  skipRetryReset: false,
});

export const incrementRetry = <TState extends BaseState>(state: TState): TState => ({
  ...state,
  retryCount: state.retryCount + 1,
});

/**
 * Builds the next state. Carries forward every field on `from` that also belongs
 * on the target, then applies `name` and `extras` (genuine deltas / overrides).
 */
export const transitionTo = <
  TFrom extends MigrationBaseState | PostInitState,
  TTo extends StateName
>(
  from: TFrom,
  name: TTo,
  extras: Omit<StateOf<TTo>, keyof TFrom | 'name'>
): StateOf<TTo> => ({ ...from, name, ...extras } as unknown as StateOf<TTo>);
