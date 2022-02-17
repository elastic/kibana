/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Ensure } from '@kbn/utility-types';
import { FC, ComponentType } from 'react';

/**
 * Base {@link StateContainer} state shape
 * @public
 */
export type BaseState = object;

/**
 * @internal
 */
export interface TransitionDescription<Type extends string = string, Args extends any[] = any[]> {
  type: Type;
  args: Args;
}
/**
 * @internal
 */
export type Transition<State extends BaseState, Args extends any[]> = (...args: Args) => State;
/**
 * Given some state and an argument, transform the state and return a new version of the state.
 * @public
 */
export type PureTransition<State extends BaseState, Args extends any[]> = (
  state: State
) => Transition<State, Args>;
/**
 * @public
 */
export type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;

/**
 * @internal
 */
export type PureTransitionToTransition<T extends PureTransition<any, any>> = ReturnType<T>;

/**
 * @internal
 */
export type PureTransitionsToTransitions<T extends object> = {
  [K in keyof T]: PureTransitionToTransition<EnsurePureTransition<T[K]>>;
};

/**
 * Base state container shape without transitions or selectors
 * @typeParam State - Shape of state in the container. Have to match {@link BaseState} constraint
 * @public
 */
export interface BaseStateContainer<State extends BaseState> {
  /**
   * Retrieves current state from the container
   * @returns current state
   * @public
   */
  get: () => State;
  /**
   * Sets state into container
   * @param state - new state to set
   */
  set: (state: State) => void;
  /**
   * {@link Observable} of state
   */
  state$: Observable<State>;
}

/**
 * Fully featured state container with {@link Selector | Selectors} and {@link Transition | Transitions}. Extends {@link BaseStateContainer}.
 * @typeParam State - Shape of state in the container. Has to match {@link BaseState} constraint
 * @typeParam PureTransitions - map of {@link PureTransition | transitions} to provide on state container
 * @typeParam PureSelectors - map of {@link PureSelector | selectors} to provide on state container
 * @public
 */
export interface StateContainer<
  State extends BaseState,
  PureTransitions extends object = object,
  PureSelectors extends object = {}
> extends BaseStateContainer<State> {
  transitions: Readonly<PureTransitionsToTransitions<PureTransitions>>;
  selectors: Readonly<PureSelectorsToSelectors<PureSelectors>>;
}

/**
 * Fully featured state container which matches Redux store interface. Extends {@link StateContainer}.
 * Allows to use state container with redux libraries.
 * @public
 */
export interface ReduxLikeStateContainer<
  State extends BaseState,
  PureTransitions extends object = {},
  PureSelectors extends object = {}
> extends StateContainer<State, PureTransitions, PureSelectors> {
  getState: () => State;
  reducer: Reducer<State>;
  replaceReducer: (nextReducer: Reducer<State>) => void;
  dispatch: (action: TransitionDescription) => void;
  addMiddleware: (middleware: Middleware<State>) => void;
  subscribe: (listener: (state: State) => void) => () => void;
}

/**
 * Redux like dispatch
 * @public
 */
export type Dispatch<T> = (action: T) => void;
/**
 * Redux like Middleware
 * @public
 */
export type Middleware<State extends BaseState = BaseState> = (
  store: Pick<ReduxLikeStateContainer<State, any>, 'getState' | 'dispatch'>
) => (
  next: (action: TransitionDescription) => TransitionDescription | any
) => Dispatch<TransitionDescription>;
/**
 * Redux like Reducer
 * @public
 */
export type Reducer<State extends BaseState> = (
  state: State,
  action: TransitionDescription
) => State;

/**
 * Utility type for inferring state shape from {@link StateContainer}
 * @public
 */
export type UnboxState<Container extends StateContainer<any, any>> =
  Container extends StateContainer<infer T, any> ? T : never;
/**
 * Utility type for inferring transitions type from {@link StateContainer}
 * @public
 */
export type UnboxTransitions<Container extends StateContainer<any, any>> =
  Container extends StateContainer<any, infer T> ? T : never;

/**
 * @public
 */
export type Selector<Result, Args extends any[] = []> = (...args: Args) => Result;
/**
 * @public
 */
export type PureSelector<State extends BaseState, Result, Args extends any[] = []> = (
  state: State
) => Selector<Result, Args>;
/**
 * @public
 */
export type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
/**
 * @public
 */
export type PureSelectorToSelector<T extends PureSelector<any, any, any>> = ReturnType<
  EnsurePureSelector<T>
>;
/**
 * @public
 */
export type PureSelectorsToSelectors<T extends object> = {
  [K in keyof T]: PureSelectorToSelector<EnsurePureSelector<T[K]>>;
};

/**
 * Used to compare state, see {@link useContainerSelector}.
 * @public
 */
export type Comparator<Result> = (previous: Result, current: Result) => boolean;
/**
 * State container state to component props mapper.
 * See {@link Connect}
 * @public
 */
export type MapStateToProps<State extends BaseState, StateProps extends object> = (
  state: State
) => StateProps;
/**
 * Similar to `connect` from react-redux,
 * allows to map state from state container to component's props.
 * @public
 */
export type Connect<State extends BaseState> = <
  Props extends object,
  StatePropKeys extends keyof Props
>(
  mapStateToProp: MapStateToProps<State, Pick<Props, StatePropKeys>>
) => (component: ComponentType<Props>) => FC<Omit<Props, StatePropKeys>>;
