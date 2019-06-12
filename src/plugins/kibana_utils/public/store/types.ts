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

export interface AppStore<State extends {}> {
  redux: ReduxStore;
  get: () => State;
  set: (state: State) => void;
  state$: Observable<State>;
  createMutations: <Pure extends PureMutations<State>>(pureMutations: Pure) => Mutations<Pure>;
}

export type PureMutation<State extends {}> = (state: State) => (...args: any[]) => State;
export type Mutation<M extends PureMutation<any>> = (...args: Parameters<ReturnType<M>>) => void;

export interface PureMutations<State extends {}> {
  [name: string]: PureMutation<State>;
}

export type Mutations<M extends PureMutations<any>> = { [K in keyof M]: Mutation<M[K]> };
