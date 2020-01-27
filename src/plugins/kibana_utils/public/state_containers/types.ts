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
import { Ensure, RecursiveReadonly } from '@kbn/utility-types';

export type BaseState = object;
export interface TransitionDescription<Type extends string = string, Args extends any[] = any[]> {
  type: Type;
  args: Args;
}
export type Transition<State extends BaseState, Args extends any[]> = (...args: Args) => State;
export type PureTransition<State extends BaseState, Args extends any[]> = (
  state: RecursiveReadonly<State>
) => Transition<State, Args>;
export type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;
export type PureTransitionToTransition<T extends PureTransition<any, any>> = ReturnType<T>;
export type PureTransitionsToTransitions<T extends object> = {
  [K in keyof T]: PureTransitionToTransition<EnsurePureTransition<T[K]>>;
};

export interface BaseStateContainer<State extends BaseState> {
  get: () => RecursiveReadonly<State>;
  set: (state: State) => void;
  state$: Observable<RecursiveReadonly<State>>;
}

export interface StateContainer<
  State extends BaseState,
  PureTransitions extends object,
  PureSelectors extends object = {}
> extends BaseStateContainer<State> {
  transitions: Readonly<PureTransitionsToTransitions<PureTransitions>>;
  selectors: Readonly<PureSelectorsToSelectors<PureSelectors>>;
}

export interface ReduxLikeStateContainer<
  State extends BaseState,
  PureTransitions extends object = {},
  PureSelectors extends object = {}
> extends StateContainer<State, PureTransitions, PureSelectors> {
  getState: () => RecursiveReadonly<State>;
  reducer: Reducer<RecursiveReadonly<State>>;
  replaceReducer: (nextReducer: Reducer<RecursiveReadonly<State>>) => void;
  dispatch: (action: TransitionDescription) => void;
  addMiddleware: (middleware: Middleware<RecursiveReadonly<State>>) => void;
  subscribe: (listener: (state: RecursiveReadonly<State>) => void) => () => void;
}

export type Dispatch<T> = (action: T) => void;
export type Middleware<State extends BaseState = BaseState> = (
  store: Pick<ReduxLikeStateContainer<State, any>, 'getState' | 'dispatch'>
) => (
  next: (action: TransitionDescription) => TransitionDescription | any
) => Dispatch<TransitionDescription>;

export type Reducer<State extends BaseState> = (
  state: State,
  action: TransitionDescription
) => State;

export type UnboxState<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<infer T, any> ? T : never;
export type UnboxTransitions<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<any, infer T> ? T : never;

export type Selector<Result, Args extends any[] = []> = (...args: Args) => Result;
export type PureSelector<State extends BaseState, Result, Args extends any[] = []> = (
  state: State
) => Selector<Result, Args>;
export type EnsurePureSelector<T> = Ensure<T, PureSelector<any, any, any>>;
export type PureSelectorToSelector<T extends PureSelector<any, any, any>> = ReturnType<
  EnsurePureSelector<T>
>;
export type PureSelectorsToSelectors<T extends object> = {
  [K in keyof T]: PureSelectorToSelector<EnsurePureSelector<T[K]>>;
};

export type Comparator<Result> = (previous: Result, current: Result) => boolean;

export type MapStateToProps<State extends BaseState, StateProps extends object> = (
  state: State
) => StateProps;
export type Connect<State extends BaseState> = <
  Props extends object,
  StatePropKeys extends keyof Props
>(
  mapStateToProp: MapStateToProps<State, Pick<Props, StatePropKeys>>
) => (component: React.ComponentType<Props>) => React.FC<Omit<Props, StatePropKeys>>;
