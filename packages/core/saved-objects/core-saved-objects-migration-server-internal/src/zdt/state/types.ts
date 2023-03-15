/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import type { IndexMapping, IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import type { MigrationLog } from '../../types';
import type { ControlState } from '../../state_action_machine';
import type { AliasAction } from '../../actions';

export interface BaseState extends ControlState {
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly logs: MigrationLog[];
}

/** Initial state before any action is performed */
export interface InitState extends BaseState {
  readonly controlState: 'INIT';
}

export interface PostInitState extends BaseState {
  /**
   * The index we're currently migrating.
   */
  readonly currentIndex: string;
  /**
   * The aliases that are already present for the current index.
   */
  readonly aliases: string[];
  /**
   * The alias actions to perform to update the aliases.
   */
  readonly aliasActions: AliasAction[];
  /**
   * The *previous* mappings (and _meta), as they were when we resolved the index
   * information. This shouldn't be updated once populated.
   */
  readonly previousMappings: IndexMapping;
  /**
   * The *current* _meta field of the index.
   * All operations updating this field will update in the state accordingly.
   */
  readonly currentIndexMeta: IndexMappingMeta;
}

export interface CreateTargetIndexState extends BaseState {
  readonly controlState: 'CREATE_TARGET_INDEX';
  readonly currentIndex: string;
  readonly indexMappings: IndexMapping;
}

export interface UpdateIndexMappingsState extends PostInitState {
  readonly controlState: 'UPDATE_INDEX_MAPPINGS';
  readonly additiveMappingChanges: SavedObjectsMappingProperties;
}

export interface UpdateIndexMappingsWaitForTaskState extends PostInitState {
  readonly controlState: 'UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK';
  readonly updateTargetMappingsTaskId: string;
}

export interface UpdateMappingModelVersionState extends PostInitState {
  readonly controlState: 'UPDATE_MAPPING_MODEL_VERSIONS';
}

export interface UpdateAliasesState extends PostInitState {
  readonly controlState: 'UPDATE_ALIASES';
}

/** Migration completed successfully */
export interface DoneState extends BaseState {
  readonly controlState: 'DONE';
}

/** Migration terminated with a failure */
export interface FatalState extends BaseState {
  readonly controlState: 'FATAL';
  /** The reason the migration was terminated */
  readonly reason: string;
}

export type State =
  | InitState
  | DoneState
  | FatalState
  | CreateTargetIndexState
  | UpdateIndexMappingsState
  | UpdateIndexMappingsWaitForTaskState
  | UpdateMappingModelVersionState
  | UpdateAliasesState;

export type AllControlStates = State['controlState'];

export type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

/**
 * Manually maintained reverse-lookup map used by `StateFromAction`
 */
export interface ControlStateMap {
  INIT: InitState;
  FATAL: FatalState;
  DONE: DoneState;
  CREATE_TARGET_INDEX: CreateTargetIndexState;
  UPDATE_INDEX_MAPPINGS: UpdateIndexMappingsState;
  UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: UpdateIndexMappingsWaitForTaskState;
  UPDATE_MAPPING_MODEL_VERSIONS: UpdateMappingModelVersionState;
  UPDATE_ALIASES: UpdateAliasesState;
}

/**
 * Utility type to reverse lookup an `AllControlStates` to it's corresponding State subtype.
 */
export type StateFromControlState<T extends AllControlStates> = ControlStateMap[T];

/**
 * Utility type to reverse lookup an `AllActionStates` to it's corresponding State subtype.
 */
export type StateFromActionState<T extends AllActionStates> = StateFromControlState<T>;
