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

import { createStateContainer, PureTransition } from '../../common/state_containers';

export interface TodoItem {
  text: string;
  completed: boolean;
  id: number;
}

export interface TodoState {
  todos: TodoItem[];
}

export const defaultState: TodoState = {
  todos: [
    {
      id: 0,
      text: 'Learning state containers',
      completed: false,
    },
  ],
};

export interface TodoActions {
  add: PureTransition<TodoState, [TodoItem]>;
  edit: PureTransition<TodoState, [TodoItem]>;
  delete: PureTransition<TodoState, [number]>;
  complete: PureTransition<TodoState, [number]>;
  completeAll: PureTransition<TodoState, []>;
  clearCompleted: PureTransition<TodoState, []>;
}

export interface TodosSelectors {
  todos: (state: TodoState) => () => TodoItem[];
  todo: (state: TodoState) => (id: number) => TodoItem | null;
}

export const pureTransitions: TodoActions = {
  add: (state) => (todo) => ({ todos: [...state.todos, todo] }),
  edit: (state) => (todo) => ({
    todos: state.todos.map((item) => (item.id === todo.id ? { ...item, ...todo } : item)),
  }),
  delete: (state) => (id) => ({ todos: state.todos.filter((item) => item.id !== id) }),
  complete: (state) => (id) => ({
    todos: state.todos.map((item) => (item.id === id ? { ...item, completed: true } : item)),
  }),
  completeAll: (state) => () => ({
    todos: state.todos.map((item) => ({ ...item, completed: true })),
  }),
  clearCompleted: (state) => () => ({ todos: state.todos.filter(({ completed }) => !completed) }),
};

export const pureSelectors: TodosSelectors = {
  todos: (state) => () => state.todos,
  todo: (state) => (id) => state.todos.find((todo) => todo.id === id) ?? null,
};

const container = createStateContainer<TodoState, TodoActions, TodosSelectors>(
  defaultState,
  pureTransitions,
  pureSelectors
);

container.transitions.add({
  id: 1,
  text: 'Learning transitions...',
  completed: false,
});
container.transitions.complete(0);
container.transitions.complete(1);

console.log(container.selectors.todos()); // eslint-disable-line

export const result = container.selectors.todos();
