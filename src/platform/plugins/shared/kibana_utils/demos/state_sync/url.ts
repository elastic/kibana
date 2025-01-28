/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultState, pureTransitions, TodoActions, TodoState } from '../state_containers/todomvc';
import { BaseState, BaseStateContainer, createStateContainer } from '../../common/state_containers';
import {
  createKbnUrlStateStorage,
  syncState,
  INullableBaseStateContainer,
  // eslint-disable-next-line @kbn/imports/no_boundary_crossing
} from '../../public/state_sync';

const tick = () => new Promise((resolve) => setTimeout(resolve));

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
  // eslint-disable-next-line @typescript-eslint/no-shadow
  stateContainer: BaseStateContainer<State>,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  defaultState: State
): INullableBaseStateContainer<State> {
  return {
    ...stateContainer,
    set: (state: State | null) => {
      stateContainer.set(state || defaultState);
    },
  };
}
