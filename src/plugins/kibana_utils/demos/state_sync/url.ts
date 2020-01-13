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

import { defaultState, pureTransitions, TodoActions, TodoState } from '../state_containers/todomvc';
import { BaseState, BaseStateContainer, createStateContainer } from '../../public/state_containers';
import {
  createKbnUrlStateStorage,
  syncState,
  INullableBaseStateContainer,
} from '../../public/state_sync';

const tick = () => new Promise(resolve => setTimeout(resolve));

const stateContainer = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);
const { start, stop } = syncState({
  stateContainer: withDefaultState(stateContainer, defaultState),
  storageKey: '_s',
  stateStorage: createKbnUrlStateStorage(),
});

start();
export const result = Promise.resolve()
  .then(() => {
    // http://localhost/#?_s=!((completed:!f,id:0,text:'Learning+state+containers')"

    stateContainer.transitions.add({
      id: 2,
      text: 'test',
      completed: false,
    });

    // http://localhost/#?_s=!((completed:!f,id:0,text:'Learning+state+containers'),(completed:!f,id:2,text:test))"

    /* actual url updates happens async */
    return tick();
  })
  .then(() => {
    stop();
    return window.location.href;
  });

function withDefaultState<State extends BaseState>(
  // eslint-disable-next-line no-shadow
  stateContainer: BaseStateContainer<State>,
  // eslint-disable-next-line no-shadow
  defaultState: State
): INullableBaseStateContainer<State> {
  return {
    ...stateContainer,
    set: (state: State | null) => {
      stateContainer.set(state || defaultState);
    },
  };
}
