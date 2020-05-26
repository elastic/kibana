/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { Ensure } from '@kbn/utility-types';
import { FC, ComponentType } from 'react';

/**
 * Base state shape valid for state container
 * @public
 */
export type BaseState = object;

/**
 * @public
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
 * @internal
 */
export type PureTransition<State extends BaseState, Args extends any[]> = (
  state: State
) => Transition<State, Args>;
/**
 * @internal
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
 * @public
 */
export interface BaseStateContainer<State extends BaseState> {
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

/**
 * Fully featured state container with selectors and transitions
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
 * Fully featured state container which matches Redux store interface
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
 * @public
 */
export type Dispatch<T> = (action: T) => void;
/**
 * @public
 */
export type Middleware<State extends BaseState = BaseState> = (
  store: Pick<ReduxLikeStateContainer<State, any>, 'getState' | 'dispatch'>
) => (
  next: (action: TransitionDescription) => TransitionDescription | any
) => Dispatch<TransitionDescription>;
/**
 * @public
 */
export type Reducer<State extends BaseState> = (
  state: State,
  action: TransitionDescription
) => State;

/**
 * Utility type for inferring state shape from {@link StateContainer}
 * @internal
 */
export type UnboxState<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<infer T, any> ? T : never;
/**
 * Utility type for inferring transitions type from {@link StateContainer}
 * @internal
 */
export type UnboxTransitions<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<any, infer T> ? T : never;

/**
 * @internal
 */
export type Selector<Result, Args extends any[] = []> = (...args: Args) => Result;
/**
 * @public
 */
export type PureSelector<State extends BaseState, Result, Args extends any[] = []> = (
  state: State
) => Selector<Result, Args>;
/**
 * @internal
 */
export type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
/**
 * @internal
 */
export type PureSelectorToSelector<T extends PureSelector<any, any, any>> = ReturnType<
  EnsurePureSelector<T>
>;
/**
 * @internal
 */
export type PureSelectorsToSelectors<T extends object> = {
  [K in keyof T]: PureSelectorToSelector<EnsurePureSelector<T[K]>>;
};

/**
 * @public
 */
export type Comparator<Result> = (previous: Result, current: Result) => boolean;
/**
 * @public
 */
export type MapStateToProps<State extends BaseState, StateProps extends object> = (
  state: State
) => StateProps;
/**
 * @public
 */
export type Connect<State extends BaseState> = <
  Props extends object,
  StatePropKeys extends keyof Props
>(
  mapStateToProp: MapStateToProps<State, Pick<Props, StatePropKeys>>
) => (component: ComponentType<Props>) => FC<Omit<Props, StatePropKeys>>;
