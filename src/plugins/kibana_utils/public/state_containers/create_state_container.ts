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

import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import { RecursiveReadonly } from '@kbn/utility-types';
import {
  PureTransitionsToTransitions,
  PureTransition,
  ReduxLikeStateContainer,
  PureSelectorsToSelectors,
} from './types';

const $$observable = (typeof Symbol === 'function' && (Symbol as any).observable) || '@@observable';

const freeze: <T>(value: T) => RecursiveReadonly<T> =
  process.env.NODE_ENV !== 'production'
    ? <T>(value: T): RecursiveReadonly<T> => {
        if (!value) return value as RecursiveReadonly<T>;
        if (value instanceof Array) return value as RecursiveReadonly<T>;
        if (typeof value === 'object') return Object.freeze({ ...value }) as RecursiveReadonly<T>;
        else return value as RecursiveReadonly<T>;
      }
    : <T>(value: T) => value as RecursiveReadonly<T>;

export const createStateContainer = <
  State,
  PureTransitions extends object,
  PureSelectors extends object = {}
>(
  defaultState: State,
  pureTransitions: PureTransitions,
  pureSelectors: PureSelectors = {} as PureSelectors
): ReduxLikeStateContainer<State, PureTransitions, PureSelectors> => {
  const data$ = new BehaviorSubject<RecursiveReadonly<State>>(freeze(defaultState));
  const state$ = data$.pipe(skip(1));
  const get = () => data$.getValue();
  const container: ReduxLikeStateContainer<State, PureTransitions, PureSelectors> = {
    get,
    state$,
    getState: () => data$.getValue(),
    set: (state: State) => {
      data$.next(freeze(state));
    },
    reducer: (state, action) => {
      const pureTransition = (pureTransitions as Record<string, PureTransition<State, any[]>>)[
        action.type
      ];
      return pureTransition ? freeze(pureTransition(state)(...action.args)) : state;
    },
    replaceReducer: nextReducer => (container.reducer = nextReducer),
    dispatch: action => data$.next(container.reducer(get(), action)),
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
    addMiddleware: middleware =>
      (container.dispatch = middleware(container as any)(container.dispatch)),
    subscribe: (listener: (state: RecursiveReadonly<State>) => void) => {
      const subscription = state$.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    [$$observable]: state$,
  };
  return container;
};
