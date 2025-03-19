/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

console.log(container.selectors.todos()); // eslint-disable-line no-console

export const result = container.selectors.todos();
