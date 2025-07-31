/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Plugin,
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  SavedObject,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

const savedObjectToTodo = (so: SavedObject<Omit<Todo, 'id'>>) => ({
  id: so.id,
  ...so.attributes,
});

export class ToDoPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}

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
      async (context, _request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();

          const todosData = await savedObjectsClient.find<Omit<Todo, 'id'>>({
            type: SAVED_OBJECTS_TYPE,
          });

          const todos = todosData.saved_objects.map(savedObjectToTodo);

          return response.ok({ body: { todos } });
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
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();

          const todo = await savedObjectsClient.get<Omit<Todo, 'id'>>(
            SAVED_OBJECTS_TYPE,
            request.params.id
          );

          return response.ok({ body: { todo: savedObjectToTodo(todo) } });
        } catch (error) {
          if (error.output?.statusCode === 404) {
            return response.notFound();
          }

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
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();

          const newTodo = await savedObjectsClient.create(SAVED_OBJECTS_TYPE, {
            title: request.body.title,
            completed: false,
          });

          return response.ok({ body: { todo: savedObjectToTodo(newTodo) } });
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
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();
          const { id } = request.params;
          const { title, completed } = request.body;

          const attributesToUpdate: Partial<Omit<Todo, 'id'>> = {};
          if (title !== undefined) {
            attributesToUpdate.title = title;
          }
          if (completed !== undefined) {
            attributesToUpdate.completed = completed;
          }

          await savedObjectsClient.update(SAVED_OBJECTS_TYPE, id, attributesToUpdate);

          const updatedTodo = await savedObjectsClient.get<Omit<Todo, 'id'>>(
            SAVED_OBJECTS_TYPE,
            id
          );

          return response.ok({ body: { todo: savedObjectToTodo(updatedTodo) } });
        } catch (error) {
          if (error.output?.statusCode === 404) {
            return response.notFound();
          }

          return response.badRequest({ body: error.message });
        }
      }
    );
  }

  public start(core: CoreStart) {}

  public stop() {}
}
