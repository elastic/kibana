/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import deepFreeze from 'deep-freeze-strict';
import {
  PureTransitionsToTransitions,
  PureTransition,
  ReduxLikeStateContainer,
  PureSelectorsToSelectors,
  BaseState,
} from './types';

const $$observable = (typeof Symbol === 'function' && (Symbol as any).observable) || '@@observable';
const $$setActionType = '@@SET';

const isProduction =
  typeof window === 'object'
    ? process.env.NODE_ENV === 'production'
    : !process.env.NODE_ENV || process.env.NODE_ENV === 'production';

const defaultFreeze: <T>(value: T) => T = isProduction
  ? <T>(value: T) => value as T
  : <T>(value: T): T => {
      const isFreezable = value !== null && typeof value === 'object';
      if (isFreezable) return deepFreeze(value) as T;
      return value as T;
    };

/**
 * State container options
 * @public
 */
export interface CreateStateContainerOptions {
  /**
   * Function to use when freezing state. Supply identity function.
   * If not provided, default `deepFreeze` is used.
   *
   * @example
   * If you expect that your state will be mutated externally an you cannot
   * prevent that
   * ```ts
   * {
   *   freeze: state => state,
   * }
   * ```
   */
  freeze?: <T>(state: T) => T;
}

/**
 * Creates a state container without transitions and without selectors.
 * @param defaultState - initial state
 * @typeParam State - shape of state
 * @public
 */
export function createStateContainer<State extends BaseState>(
  defaultState: State
): ReduxLikeStateContainer<State>;
/**
 * Creates a state container with transitions, but without selectors.
 * @param defaultState - initial state
 * @param pureTransitions - state transitions configuration object. Map of {@link PureTransition}.
 * @typeParam State - shape of state
 * @public
 */
export function createStateContainer<State extends BaseState, PureTransitions extends object>(
  defaultState: State,
  pureTransitions: PureTransitions
): ReduxLikeStateContainer<State, PureTransitions>;

/**
 * Creates a state container with transitions and selectors.
 * @param defaultState - initial state
 * @param pureTransitions - state transitions configuration object. Map of {@link PureTransition}.
 * @param pureSelectors - state selectors configuration object. Map of {@link PureSelectors}.
 * @param options - state container options {@link CreateStateContainerOptions}
 * @typeParam State - shape of state
 * @public
 */
export function createStateContainer<
  State extends BaseState,
  PureTransitions extends object,
  PureSelectors extends object
>(
  defaultState: State,
  pureTransitions: PureTransitions,
  pureSelectors: PureSelectors,
  options?: CreateStateContainerOptions
): ReduxLikeStateContainer<State, PureTransitions, PureSelectors>;
/**
 * @internal
 */
export function createStateContainer<
  State extends BaseState,
  PureTransitions extends object,
  PureSelectors extends object
>(
  defaultState: State,
  pureTransitions: PureTransitions = {} as PureTransitions, // TODO: https://github.com/elastic/kibana/issues/54439
  pureSelectors: PureSelectors = {} as PureSelectors, // TODO: https://github.com/elastic/kibana/issues/54439
  options: CreateStateContainerOptions = {}
): ReduxLikeStateContainer<State, PureTransitions, PureSelectors> {
  const { freeze = defaultFreeze } = options;
  const data$ = new BehaviorSubject<State>(freeze(defaultState));
  const state$ = data$.pipe(skip(1));
  const get = () => data$.getValue();
  const container: ReduxLikeStateContainer<State, PureTransitions, PureSelectors> = {
    get,
    state$,
    getState: () => data$.getValue(),
    set: (state: State) => {
      container.dispatch({ type: $$setActionType, args: [state] });
    },
    reducer: (state, action) => {
      if (action.type === $$setActionType) {
        return freeze(action.args[0] as State);
      }

      const pureTransition = (pureTransitions as Record<string, PureTransition<State, any[]>>)[
        action.type
      ];
      return pureTransition ? freeze(pureTransition(state)(...action.args)) : state;
    },
    replaceReducer: (nextReducer) => (container.reducer = nextReducer),
    dispatch: (action) => data$.next(container.reducer(get(), action)),
    transitions: Object.keys(pureTransitions).reduce<PureTransitionsToTransitions<PureTransitions>>(
      (acc, type) => ({ ...acc, [type]: (...args: any) => container.dispatch({ type, args }) }),
      {} as PureTransitionsToTransitions<PureTransitions>
    ),
    selectors: Object.keys(pureSelectors).reduce<PureSelectorsToSelectors<PureSelectors>>(
      (acc, selector) => ({
        ...acc,
        [selector]: (...args: any) => (pureSelectors as any)[selector](get())(...args),
      }),
      {} as PureSelectorsToSelectors<PureSelectors>
    ),
    addMiddleware: (middleware) =>
      (container.dispatch = middleware(container as any)(container.dispatch)),
    subscribe: (listener: (state: State) => void) => {
      const subscription = state$.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    [$$observable]: state$,
  };
  return container;
}
