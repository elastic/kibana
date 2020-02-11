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

import * as Rx from 'rxjs';
import { scan, distinctUntilChanged, startWith } from 'rxjs/operators';

export interface StoreUpdate<Event, State> {
  event?: Event;
  state: State;
}

export type StoreEventType<
  Store extends Rx.Observable<StoreUpdate<any, any>>
> = Store extends Rx.Observable<StoreUpdate<infer Event, any>> ? Event : never;

export type StoreStateType<
  Store extends Rx.Observable<StoreUpdate<any, any>>
> = Store extends Rx.Observable<StoreUpdate<infer State, any>> ? State : never;

export type StoreReducerType<Store extends Rx.Observable<StoreUpdate<any, any>>> = (
  prev: StoreStateType<Store>,
  event: StoreEventType<Store>
) => StoreStateType<Store>;

export type Reducer<Event, State> = (prev: State, event: Event) => State;

/**
 * Create a simple store that merges together a series of events into a
 * single stream of state updates produced by the reducer function.
 */
export const createStore = <Event, State>(
  event$: Rx.Observable<Event>,
  initialState: State,
  reducer: Reducer<Event, State>
): Rx.Observable<StoreUpdate<Event, State>> => {
  const initUpdate: StoreUpdate<Event, State> = {
    state: initialState,
  };

  return event$.pipe(
    scan((prev: StoreUpdate<Event, State>, event) => {
      const newState = reducer(prev.state, event);
      return newState === prev.state
        ? prev
        : {
            event,
            state: newState,
          };
    }, initUpdate),
    distinctUntilChanged(),
    startWith(initUpdate)
  );
};
