/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CrudClient } from '../../public/crud_client';
import type { CreateIn, DeleteIn, GetIn, SearchIn, SearchOut, UpdateIn } from '../../common';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export class TodosClient implements CrudClient {
  private todos: Todo[] = [
    { id: uuidv4(), title: 'Learn Elasticsearch', completed: true },
    { id: uuidv4(), title: 'Learn Kibana', completed: false },
  ];

  async create<I extends CreateIn = CreateIn, O = unknown>(input: I): Promise<O> {
    const todo = {
      id: uuidv4(),
      title: input.data.title as string,
      completed: false,
    };
    this.todos.push(todo);
    return todo as unknown as O;
  }

  async delete<I extends DeleteIn = DeleteIn, O = unknown>(input: I): Promise<O> {
    // @ts-ignore
    const idToDelete = input.data.id;
    const todoToDelete = this.todos.find((todo) => todo.id === idToDelete);
    this.todos = this.todos.filter((todo) => todo.id !== idToDelete);

    return todoToDelete as unknown as O;
  }

  async get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.todos.find((todo) => todo.id === input.id) as unknown as O;
  }

  async search<I extends SearchIn = SearchIn, O extends SearchOut = SearchOut>(
    input: I
  ): Promise<O> {
    const filter = input.params.filter as string;
    if (filter === 'todo') return { hits: this.todos.filter((t) => !t.completed) } as unknown as O;
    if (filter === 'completed')
      return { hits: this.todos.filter((t) => t.completed) } as unknown as O;
    return { hits: [...this.todos] } as unknown as O;
  }

  async update<I extends UpdateIn = UpdateIn, O = unknown>(input: I): Promise<O> {
    // @ts-ignore
    const idToUpdate = input.data.id;
    const todoToUpdate = this.todos.find((todo) => todo.id === idToUpdate);
    if (todoToUpdate) {
      Object.assign(todoToUpdate, input.data);
    }
    return todoToUpdate as unknown as O;
  }
}
