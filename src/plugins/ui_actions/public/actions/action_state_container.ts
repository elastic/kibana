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

import { createStateContainer, StateContainer } from '../../../kibana_utils/common';

export interface ActionState<Config extends object> {
  readonly name: string;
  readonly config: Config;
}

export interface ActionStateTransitions<Config extends object> {
  setName: (state: ActionState<Config>) => (name: string) => ActionState<Config>;
  setConfig: (state: ActionState<Config>) => (config: Config) => ActionState<Config>;
}

export type ActionStateContainer<Config extends object> = StateContainer<
  ActionState<Config>,
  ActionStateTransitions<Config>,
  {}
>;

export const defaultState: ActionState<object> = {
  name: '',
  config: {},
};

const pureTransitions: ActionStateTransitions<any> = {
  setName: state => name => ({ ...state, name }),
  setConfig: state => config => ({ ...state, config }),
};

export const createActionStateContainer = <Config extends object>(
  state: Partial<ActionState<Config>>
): ActionStateContainer<Config> =>
  createStateContainer({ ...defaultState, ...state } as ActionState<Config>, pureTransitions);
