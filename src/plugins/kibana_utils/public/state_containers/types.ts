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

export type Ensure<T, X> = T extends X ? T : never;
export type EnsureFunction<F> = Ensure<F, (...args: any) => any>;

export interface TransitionDescription<Type extends string = string, Args extends any[] = any[]> {
  type: Type;
  args: Args;
}
export type Transition<State, Args extends any[]> = (...args: Args) => State;
export type PureTransition<State, Args extends any[]> = (state: State) => Transition<State, Args>;
export type EnsurePureTransition<T> = Ensure<T, PureTransition<any, any>>;
export type PureTransitionToTransition<T extends PureTransition<any, any>> = ReturnType<T>;
export type PureTransitionsToTransitions<T extends object> = {
  [K in keyof T]: PureTransitionToTransition<EnsurePureTransition<T[K]>>;
};

export interface BaseStateContainer<State> {
  state: State;
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
}

export interface StateContainer<State, PureTransitions extends object>
  extends BaseStateContainer<State> {
  transitions: PureTransitionsToTransitions<PureTransitions>;
}

export interface ReduxLikeStateContainer<State, PureTransitions extends object>
  extends StateContainer<State, PureTransitions> {
  getState: () => State;
  reducer: Reducer<State>;
  replaceReducer: (nextReducer: Reducer<State>) => void;
  dispatch: (action: TransitionDescription) => void;
  addMiddleware: (middleware: Middleware<State>) => void;
  subscribe: (listener: (state: State) => void) => () => void;
}

export type Dispatch<T> = (action: T) => void;

export type Middleware<State = any> = (
  store: Pick<ReduxLikeStateContainer<State, any>, 'getState' | 'dispatch'>
) => (
  next: (action: TransitionDescription) => TransitionDescription | any
) => Dispatch<TransitionDescription>;

export type Reducer<State> = (state: State, action: TransitionDescription) => State;

export type UnboxState<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<infer T, any> ? T : never;
export type UnboxTransitions<
  Container extends StateContainer<any, any>
> = Container extends StateContainer<any, infer T> ? T : never;

export type Selector<State, Result> = (state: State) => Result;
export type Comparator<Result> = (previous: Result, current: Result) => boolean;

export type MapStateToProps<State, StateProps extends {}> = Selector<State, StateProps>;

export type Connect<State extends {}> = <Props extends {}, StatePropKeys extends keyof Props>(
  mapStateToProp: MapStateToProps<State, Pick<Props, StatePropKeys>>
) => (component: React.ComponentType<Props>) => React.FC<Omit<Props, StatePropKeys>>;
