/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as CHECK_SOURCE from './steps/check_source';
import type * as CREATE_TARGET from './steps/create_target';
import * as DONE from './steps/done';
import * as FATAL from './steps/fatal';
import * as INIT from './steps/init';
import type * as MARK_READY from './steps/mark_ready';

export interface BaseState {
  readonly retryAttempts: number;
  readonly retryCount: number;
  readonly logs: readonly string[];
}

export type State =
  | INIT.State
  | CHECK_SOURCE.State
  | CREATE_TARGET.State
  | MARK_READY.State
  | DONE.State
  | FATAL.State;

export type StateName = State['name'];
export type NonTerminalState = Exclude<State, DONE.State | FATAL.State>;
export type TerminalState = DONE.State | FATAL.State;
export type StateOf<TName extends StateName> = Extract<State, { name: TName }>;

type TransitionExtras<TName extends StateName> = Omit<StateOf<TName>, keyof BaseState | 'name'>;

export const createInitialState = (retryAttempts: number): INIT.State => ({
  name: INIT.Name,
  retryAttempts,
  retryCount: 0,
  logs: [],
});

export const isTerminalState = (state: State): state is TerminalState =>
  state.name === DONE.Name || state.name === FATAL.Name;

export const appendLog = <TState extends State>(state: TState, message: string): TState => ({
  ...state,
  logs: [...state.logs, message],
});

export const resetRetry = <TState extends State>(state: TState): TState => ({
  ...state,
  retryCount: 0,
});

export const incrementRetry = <TState extends State>(state: TState): TState => ({
  ...state,
  retryCount: state.retryCount + 1,
});

export const transitionTo = <TName extends StateName>(
  carry: BaseState,
  name: TName,
  extras: TransitionExtras<TName>
): StateOf<TName> =>
  // Cast safe by construction: each step's State is BaseState plus its
  // discriminant `name` and the exact extras required by that state.
  ({
    name,
    retryAttempts: carry.retryAttempts,
    retryCount: carry.retryCount,
    logs: carry.logs,
    ...extras,
  } as StateOf<TName>);
