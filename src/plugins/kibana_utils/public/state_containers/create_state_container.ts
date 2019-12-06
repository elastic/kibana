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

import { Subject } from 'rxjs';
import { PureTransitionsToTransitions, PureTransition, ReduxLikeStateContainer } from './types';

const $$observable = (typeof Symbol === 'function' && (Symbol as any).observable) || '@@observable';

export const createStateContainer = <State, PureTransitions extends object>(
  defaultState: State,
  pureTransitions: PureTransitions
): ReduxLikeStateContainer<State, PureTransitions> => {
  const state$ = new Subject<State>();
  const container: ReduxLikeStateContainer<State, PureTransitions> = {
    state: defaultState,
    get: () => container.state,
    getState: () => container.state,
    set: (state: State) => {
      container.state = state;
      state$.next(state);
    },
    state$,
    reducer: (state, action) => {
      const pureTransition = (pureTransitions as Record<string, PureTransition<State, any[]>>)[
        action.type
      ];
      return pureTransition ? pureTransition(state)(...action.args) : state;
    },
    replaceReducer: nextReducer => (container.reducer = nextReducer),
    dispatch: action => state$.next((container.state = container.reducer(container.state, action))),
    transitions: Object.keys(pureTransitions).reduce<PureTransitionsToTransitions<PureTransitions>>(
      (acc, type) => ({ ...acc, [type]: (...args: any) => container.dispatch({ type, args }) }),
      {} as PureTransitionsToTransitions<PureTransitions>
    ),
    addMiddleware: middleware => (container.dispatch = middleware(container)(container.dispatch)),
    subscribe: (listener: (state: State) => void) => {
      const subscription = state$.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    [$$observable]: state$,
  };
  return container;
};
