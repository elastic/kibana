/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import {
  CreateIn,
  DeleteIn,
  GetIn,
  SearchIn,
  UpdateIn,
} from '@kbn/content-management-plugin/common';

export const TODO_CONTENT_ID = 'todos';
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type TodoCreateIn = CreateIn<'todos', { title: string }>;
export const createInSchema = schema.object({ title: schema.string() });

export type TodoUpdateIn = UpdateIn<'todos', Partial<Omit<Todo, 'id'>>>;
export const updateInSchema = schema.object({
  title: schema.maybe(schema.string()),
  completed: schema.maybe(schema.boolean()),
});

export type TodoDeleteIn = DeleteIn<'todos', { id: string }>;
// no schema for delete ?

export type TodoGetIn = GetIn<'todos'>;
// no schema for get ?

export type TodoSearchIn = SearchIn<'todos', { filter?: 'todo' | 'completed' }>;
export const searchInSchema = schema.object({
  filter: schema.maybe(
    schema.oneOf([schema.literal('todo'), schema.literal('completed')], {
      defaultValue: undefined,
    })
  ),
});
