/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MigrationLog } from '../../types';
import type { ControlState } from '../../state_action_machine';

export interface BaseState extends ControlState {
  readonly retryCount: number;
  readonly retryDelay: number;
  readonly logs: MigrationLog[];
}

export interface InitState extends BaseState {
  readonly controlState: 'INIT';
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

export type State = InitState | DoneState | FatalState;

export type AllControlStates = State['controlState'];

export type AllActionStates = Exclude<AllControlStates, 'FATAL' | 'DONE'>;

/**
 * Manually maintained reverse-lookup map used by `StateFromAction`
 */
export interface ControlStateMap {
  INIT: InitState;
  FATAL: FatalState;
  DONE: DoneState;
}

/**
 * Utility type to reverse lookup an `AllControlStates` to it's corresponding State subtype.
 */
export type StateFromControlState<T extends AllControlStates> = ControlStateMap[T];

/**
 * Utility type to reverse lookup an `AllActionStates` to it's corresponding State subtype.
 */
export type StateFromActionState<T extends AllActionStates> = StateFromControlState<T>;
