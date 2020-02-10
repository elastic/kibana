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

import { PersistedState } from '../../../legacy_imports';
import { ReduxLikeStateContainer } from '../../../../../../../../plugins/kibana_utils/public';
import { VisualizeAppState, VisualizeAppStateTransitions } from '../../types';

interface PersistedStates {
  [key: string]: PersistedState;
}

const persistedStates: PersistedStates = {};
const eventUnsubscribers: Function[] = [];

/**
 * @returns PersistedState instance.
 */
export function makeStateful(
  prop: keyof VisualizeAppState,
  stateContainer: ReduxLikeStateContainer<VisualizeAppState, VisualizeAppStateTransitions>
) {
  if (persistedStates[prop]) return persistedStates[prop];

  // set up the ui state
  persistedStates[prop] = new PersistedState();

  // update the appState when the stateful instance changes
  const updateOnChange = function() {
    stateContainer.transitions.set(prop, persistedStates[prop].getChanges());
  };

  const handlerOnChange = (method: 'on' | 'off') =>
    persistedStates[prop][method]('change', updateOnChange);

  handlerOnChange('on');
  eventUnsubscribers.push(() => handlerOnChange('off'));

  // update the stateful object when the app state changes
  const persistOnChange = function(state: VisualizeAppState) {
    if (state[prop]) {
      persistedStates[prop].set(state[prop]);
    }
  };

  const appState = stateContainer.getState();

  // if the thing we're making stateful has an appState value, write to persisted state
  if (appState[prop]) persistedStates[prop].setSilent(appState[prop]);

  return { [prop]: persistedStates[prop], eventUnsubscribers, persistOnChange };
}
