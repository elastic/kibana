/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, PluginInitializerContext, CoreSetup, CoreStart } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import crypto from 'crypto';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export class ToDoPlugin implements Plugin {
  private todos: Todo[];

  constructor(initializerContext: PluginInitializerContext) {
    this.todos = [];
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const savedObjects = core.savedObjects;

    const SAVED_OBJECTS_TYPE = 'todo';
    savedObjects.registerType({
      name: SAVED_OBJECTS_TYPE,
      namespaceType: 'single',
      hidden: false,
      mappings: {
        properties: {
          completed: { type: 'boolean' },
          title: { type: 'text' },
        },
      },
    });

    router.get(
      {
        path: '/api/todos',
        validate: false,
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        options: { access: 'public' },
      },
      async (_context, _request, response) => {
        try {
          return response.ok({ body: { todos: this.todos } });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );

    router.get(
      {
        path: '/api/todos/{id}',
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        options: { access: 'public' },
      },
      async (_context, request, response) => {
        try {
          const todo = this.todos.find((t) => t.id === request.params.id);

          if (!todo) return response.notFound();

          return response.ok({ body: { todo } });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );

    router.post(
      {
        path: '/api/todos',
        validate: {
          body: schema.object({
            title: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        options: { access: 'public' },
      },
      async (_context, request, response) => {
        try {
          const newTodo: Todo = {
            id: crypto.randomUUID(),
            completed: false,
            title: request.body.title,
          };

          this.todos.push(newTodo);

          return response.ok({ body: { todo: newTodo } });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );

    router.put(
      {
        path: '/api/todos/{id}',
        validate: {
          body: schema.object({
            title: schema.maybe(schema.string()),
            completed: schema.maybe(schema.boolean()),
          }),
          params: schema.object({
            id: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        options: { access: 'public' },
      },
      async (_context, request, response) => {
        try {
          const todoIndex = this.todos.findIndex((t) => t.id === request.params.id);

          if (todoIndex === -1) return response.notFound();

          const updatedTodo: Todo = {
            ...this.todos[todoIndex],
            ...request.body,
          };

          this.todos[todoIndex] = updatedTodo;

          return response.ok({ body: { todo: updatedTodo } });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );
  }

  public start(core: CoreStart) {}

  public stop() {}
}
