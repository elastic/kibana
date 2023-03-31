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
const todoSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  completed: schema.boolean(),
});

export type TodoCreateIn = CreateIn<'todos', { title: string }>;
export type TodoCreateOut = Todo; // TODO: Is this correct?
export const createInSchema = schema.object({ title: schema.string() });
export const createOutSchema = todoSchema;

export type TodoUpdateIn = UpdateIn<'todos', Partial<Omit<Todo, 'id'>>>;
export type TodoUpdateOut = Todo;
export const updateInSchema = schema.object({
  title: schema.maybe(schema.string()),
  completed: schema.maybe(schema.boolean()),
});
export const updateOutSchema = todoSchema;

export type TodoDeleteIn = DeleteIn<'todos', { id: string }>;
export type TodoDeleteOut = void;

export type TodoGetIn = GetIn<'todos'>;
export type TodoGetOut = Todo;
export const getOutSchema = todoSchema;

export type TodoSearchIn = SearchIn<'todos', { filter?: 'todo' | 'completed' }>;
export interface TodoSearchOut {
  hits: Todo[];
}
export const searchInSchema = schema.object({
  filter: schema.maybe(
    schema.oneOf([schema.literal('todo'), schema.literal('completed')], {
      defaultValue: undefined,
    })
  ),
});
export const searchOutSchema = schema.object({
  hits: schema.arrayOf(todoSchema),
});
