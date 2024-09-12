/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CreateIn,
  CreateResult,
  DeleteIn,
  DeleteResult,
  GetIn,
  GetResult,
  SearchIn,
  SearchResult,
  UpdateIn,
  UpdateResult,
} from '@kbn/content-management-plugin/common';

export const TODO_CONTENT_ID = 'todos';
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type TodoCreateIn = CreateIn<'todos', { title: string }>;
export type TodoCreateOut = CreateResult<Todo>;

export type TodoUpdateIn = UpdateIn<'todos', Partial<Omit<Todo, 'id'>>>;
export type TodoUpdateOut = UpdateResult<Todo>;

export type TodoDeleteIn = DeleteIn<'todos', { id: string }>;
export type TodoDeleteOut = DeleteResult;

export type TodoGetIn = GetIn<'todos'>;
export type TodoGetOut = GetResult<Todo>;

export type TodoSearchIn = SearchIn<'todos', { filter?: 'todo' | 'completed' }>;
export type TodoSearchOut = SearchResult<Todo>;
