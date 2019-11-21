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
import { Store as ReduxStore } from 'redux';

export interface AppStore<
  State extends {},
  StateMutators extends Mutators<PureMutators<State>> = {}
> {
  redux: ReduxStore;
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
  createMutators: <M extends PureMutators<State>>(pureMutators: M) => Mutators<M>;
  mutators: StateMutators;
}

export type PureMutator<State extends {}> = (state: State) => (...args: any[]) => State;
export type Mutator<M extends PureMutator<any>> = (...args: Parameters<ReturnType<M>>) => void;

export interface PureMutators<State extends {}> {
  [name: string]: PureMutator<State>;
}

export type Mutators<M extends PureMutators<any>> = { [K in keyof M]: Mutator<M[K]> };
