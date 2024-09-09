/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimpleTodoApp } from './todo.stories';

test('SimpleTodoApp works', async () => {
  render(<SimpleTodoApp />);

  // check initial todos
  let todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(2);
  let [firstTodo, secondTodo] = todos;
  expect(firstTodo).toHaveTextContent('Learn Elasticsearch');
  expect(secondTodo).toHaveTextContent('Learn Kibana');

  const [firstTodoCheckbox, secondTodoCheckbox] = await screen.findAllByRole('checkbox');
  expect(firstTodoCheckbox).toBeChecked();
  expect(secondTodoCheckbox).not.toBeChecked();

  // apply "completed" filter
  let todoFilters = screen.getByRole('group', { name: 'Todo filters' });
  let completedFilter = within(todoFilters).getByTestId('completed');
  userEvent.click(completedFilter);

  // check only completed todos are shown
  todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(1);
  [firstTodo] = todos;
  expect(firstTodo).toHaveTextContent('Learn Elasticsearch');

  // apply "todo" filter
  todoFilters = screen.getByRole('group', { name: 'Todo filters' });
  const todoFilter = within(todoFilters).getByTestId('todo');
  userEvent.click(todoFilter);

  // check only todo todos are shown
  todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(1);
  [firstTodo] = todos;
  expect(firstTodo).toHaveTextContent('Learn Kibana');

  // apply "all" filter
  todoFilters = screen.getByRole('group', { name: 'Todo filters' });
  const allFilter = within(todoFilters).getByTestId('all');
  userEvent.click(allFilter);

  // check all todos are shown
  todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(2);
  [firstTodo, secondTodo] = todos;

  // add new todo
  const newTodoInput = screen.getByTestId('newTodo');
  userEvent.type(newTodoInput, 'Learn React{enter}');

  // wait for new todo to be added
  await screen.findByText('Learn React');
  todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(3);
  let newTodo = todos[2];

  // mark new todo as completed
  userEvent.click(within(newTodo).getByRole('checkbox'));

  // apply "completed" filter again
  todoFilters = screen.getByRole('group', { name: 'Todo filters' });
  completedFilter = within(todoFilters).getByTestId('completed');
  userEvent.click(completedFilter);

  // check only completed todos are shown and a new todo is there
  await screen.findByText('Learn React'); // wait for new todo to be there
  todos = await screen.findAllByRole('listitem');
  expect(todos).toHaveLength(2);
  [firstTodo, newTodo] = todos;
  expect(newTodo).toHaveTextContent('Learn React');

  // remove new todo
  userEvent.click(within(newTodo).getByLabelText('Delete'));

  // wait for new todo to be removed
  await waitForElementToBeRemoved(() => screen.getByText('Learn React'));
});
