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

import { Reducer } from 'react';

import { ContextValue } from './editor_context';

export type ActionType =
  | 'setInputValue'
  | 'setOutputValue'
  | 'appendOutputValue'
  | 'setInputEditor'
  | 'setOutputEditor'
  | 'inputReady'
  | 'outputReady';

export interface Action {
  type: ActionType;
  value?: any;
}

export const reducer: Reducer<ContextValue, Action> = (state, action) => {
  const nextState = { ...state };

  if (action.type === 'inputReady') {
    nextState.input.ready = true;
    if (nextState.output.ready) {
      nextState.editorsReady = true;
    }
  }

  if (action.type === 'outputReady') {
    nextState.output.ready = true;
    if (nextState.input.ready) {
      nextState.editorsReady = true;
    }
  }

  return nextState;
};
