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

import { createStore as createReduxStore, Reducer } from 'redux';
import { Subject, Observable } from 'rxjs';
import { AppStore, Mutators, PureMutators } from './types';

const SET = '__SET__';

export const createStore = <
  State extends {},
  StateMutators extends Mutators<PureMutators<State>> = {}
>(
  defaultState: State
): AppStore<State, StateMutators> => {
  const pureMutators: PureMutators<State> = {};
  const mutators: StateMutators = {} as StateMutators;
  const reducer: Reducer = (state, action) => {
    const pureMutator = pureMutators[action.type];
    if (pureMutator) {
      return pureMutator(state)(...action.args);
    }

    switch (action.type) {
      case SET:
        return action.state;
      default:
        return state;
    }
  };
  const redux = createReduxStore<State, any, any, any>(reducer, defaultState as any);

  const get = redux.getState;

  const set = (state: State) =>
    redux.dispatch({
      type: SET,
      state,
    });

  const state$ = new Subject();
  redux.subscribe(() => {
    state$.next(get());
  });

  const createMutators: AppStore<State>['createMutators'] = newPureMutators => {
    const result: Mutators<any> = {};
    for (const type of Object.keys(newPureMutators)) {
      result[type] = (...args) => {
        redux.dispatch({
          type,
          args,
        });
      };
    }
    Object.assign(pureMutators, newPureMutators);
    Object.assign(mutators, result);
    return result;
  };

  return {
    get,
    set,
    redux,
    state$: (state$ as unknown) as Observable<State>,
    createMutators,
    mutators,
  };
};
