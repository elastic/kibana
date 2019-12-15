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

import { createStateContainer, PureTransition } from '../../public/state_containers';

export interface TodoItem {
  text: string;
  completed: boolean;
  id: number;
}

export type TodoState = TodoItem[];

export const defaultState: TodoState = [
  {
    id: 0,
    text: 'Learning state containers',
    completed: false,
  },
];

export interface TodoActions {
  add: PureTransition<TodoState, [TodoItem]>;
  edit: PureTransition<TodoState, [TodoItem]>;
  delete: PureTransition<TodoState, [number]>;
  complete: PureTransition<TodoState, [number]>;
  completeAll: PureTransition<TodoState, []>;
  clearCompleted: PureTransition<TodoState, []>;
}

export const pureTransitions: TodoActions = {
  add: state => todo => [...state, todo],
  edit: state => todo => state.map(item => (item.id === todo.id ? { ...item, ...todo } : item)),
  delete: state => id => state.filter(item => item.id !== id),
  complete: state => id =>
    state.map(item => (item.id === id ? { ...item, completed: true } : item)),
  completeAll: state => () => state.map(item => ({ ...item, completed: true })),
  clearCompleted: state => () => state.filter(({ completed }) => !completed),
};

const container = createStateContainer<TodoState, TodoActions>(defaultState, pureTransitions);

container.transitions.add({
  id: 1,
  text: 'Learning transitions...',
  completed: false,
});
container.transitions.complete(0);
container.transitions.complete(1);

console.log(container.get()); // eslint-disable-line

export const result = container.get();
