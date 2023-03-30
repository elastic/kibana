/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CrudClient } from '@kbn/content-management-plugin/public';
import type {
  TodoCreateIn,
  TodoUpdateIn,
  TodoDeleteIn,
  TodoGetIn,
  TodoSearchIn,
  TodoUpdateOut,
  TodoCreateOut,
  TodoSearchOut,
  TodoDeleteOut,
  Todo,
  TodoGetOut,
} from '../../../../common/examples/todos';

/**
 * This client is used in the storybook examples to simulate a server-side registry client
 * and to show how a content type can have a custom client-side CRUD client without using the server-side registry
 */
export class TodosClient implements CrudClient {
  private todos: Todo[] = [
    { id: uuidv4(), title: 'Learn Elasticsearch', completed: true },
    { id: uuidv4(), title: 'Learn Kibana', completed: false },
  ];

  async create(input: TodoCreateIn): Promise<TodoCreateOut> {
    const todo = {
      id: uuidv4(),
      title: input.data.title,
      completed: false,
    };
    this.todos.push(todo);
    return todo;
  }

  async delete(input: TodoDeleteIn): Promise<TodoDeleteOut> {
    this.todos = this.todos.filter((todo) => todo.id !== input.id);
  }

  async get(input: TodoGetIn): Promise<TodoGetOut> {
    return this.todos.find((todo) => todo.id === input.id)!;
  }

  async search(input: TodoSearchIn): Promise<TodoSearchOut> {
    const filter = input.query.filter;
    if (filter === 'todo') return { hits: this.todos.filter((t) => !t.completed) };
    if (filter === 'completed') return { hits: this.todos.filter((t) => t.completed) };
    return { hits: [...this.todos] };
  }

  async update(input: TodoUpdateIn): Promise<TodoUpdateOut> {
    const idToUpdate = input.id;
    const todoToUpdate = this.todos.find((todo) => todo.id === idToUpdate)!;
    if (todoToUpdate) {
      Object.assign(todoToUpdate, input.data);
    }
    return { ...todoToUpdate };
  }
}
