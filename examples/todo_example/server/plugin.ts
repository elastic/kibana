/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  SavedObject,
} from '@kbn/core/server';
import type {
  SavedObjectModelTransformationDoc,
  SavedObjectsModelVersionMap,
} from '@kbn/core-saved-objects-server';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import type { Todo } from '../common';

const savedObjectToTodo = (so: SavedObject<Omit<Todo, 'id'>>) => ({
  id: so.id,
  ...so.attributes,
});

const MODEL_VERSIONS: SavedObjectsModelVersionMap = {
  1: {
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {
          priority: { type: 'keyword' },
        },
      },
      {
        type: 'data_backfill',
        backfillFn: (doc: SavedObjectModelTransformationDoc<Todo>) => {
          if (doc.attributes.priority === undefined) {
            doc.attributes.priority = 'Medium';
          }
          if (!doc.references) {
            doc.references = [];
          }
          return doc;
        },
      },
    ],
  },
};

export class ToDoPlugin implements Plugin {
  private readonly hideCompleted: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    const { hideCompleted } = initializerContext.config.get<{ hideCompleted: boolean }>();

    this.hideCompleted = hideCompleted;
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();
    const savedObjects = core.savedObjects;

    core.uiSettings.register({
      'todo:hideCompleted': {
        category: ['todo'],
        description: i18n.translate('todo.uiSettings.hideCompleted.description', {
          defaultMessage: 'Hide completed todos from the list.',
        }),
        name: i18n.translate('todo.uiSettings.hideCompleted.name', {
          defaultMessage: 'Hide completed todos',
        }),
        requiresPageReload: false,
        schema: schema.boolean(),
        value: this.hideCompleted,
      },
    });

    const SAVED_OBJECTS_TYPE = 'todo';
    savedObjects.registerType({
      mappings: {
        properties: {
          completed: { type: 'boolean' },
          order: { type: 'integer' },
          priority: { type: 'keyword' },
          title: { type: 'text' },
        },
      },
      modelVersions: MODEL_VERSIONS,
      name: SAVED_OBJECTS_TYPE,
      namespaceType: 'single',
      hidden: false,
    });

    router.get(
      {
        path: '/api/todos',
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: false,
      },
      async (context, _request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();
          const uiSettingsClient = (await context.core).uiSettings.client;

          const hideCompleted = await uiSettingsClient.get('todo:hideCompleted');

          const todosData = await savedObjectsClient.find<Omit<Todo, 'id'>>({
            type: SAVED_OBJECTS_TYPE,
            sortField: 'order',
            sortOrder: 'asc',
          });

          let todos = todosData.saved_objects.map(savedObjectToTodo);

          if (hideCompleted) {
            todos = todos.filter((todo) => !todo.completed);
          }

          return response.ok({ body: todos });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );

    router.get(
      {
        path: '/api/todos/{id}',
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();

          const todo = await savedObjectsClient.get<Omit<Todo, 'id'>>(
            SAVED_OBJECTS_TYPE,
            request.params.id
          );

          return response.ok({ body: savedObjectToTodo(todo) });
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
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: {
          body: schema.object({
            completed: schema.boolean(),
            order: schema.maybe(schema.number()),
            priority: schema.oneOf([
              schema.literal('High'),
              schema.literal('Medium'),
              schema.literal('Low'),
            ]),
            title: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();

          let order = request.body.order;

          if (order === undefined) {
            const existingTodos = await savedObjectsClient.find<Omit<Todo, 'id'>>({
              type: SAVED_OBJECTS_TYPE,
              perPage: 1,
              sortField: 'order',
              sortOrder: 'desc',
            });
            order =
              existingTodos.saved_objects.length > 0
                ? (existingTodos.saved_objects[0].attributes.order || 0) + 1
                : 0;
          }

          const todoData = {
            ...request.body,
            order,
          };

          const newTodo = await savedObjectsClient.create(SAVED_OBJECTS_TYPE, todoData);

          return response.ok({ body: savedObjectToTodo(newTodo) });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );

    router.put(
      {
        path: '/api/todos/{id}',
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: {
          body: schema.object({
            completed: schema.maybe(schema.boolean()),
            order: schema.maybe(schema.number()),
            priority: schema.maybe(
              schema.oneOf([
                schema.literal('High'),
                schema.literal('Medium'),
                schema.literal('Low'),
              ])
            ),
            title: schema.maybe(schema.string()),
          }),
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();
          const { id } = request.params;

          const current = await savedObjectsClient.get<Omit<Todo, 'id'>>(SAVED_OBJECTS_TYPE, id);

          const updatedAttributes = {
            ...current.attributes,
            ...request.body,
          };

          await savedObjectsClient.update(SAVED_OBJECTS_TYPE, id, updatedAttributes);

          const updatedTodo = await savedObjectsClient.get<Omit<Todo, 'id'>>(
            SAVED_OBJECTS_TYPE,
            id
          );

          return response.ok({ body: savedObjectToTodo(updatedTodo) });
        } catch (error) {
          if (error.output?.statusCode === 404) {
            return response.notFound();
          }

          return response.badRequest({ body: error.message });
        }
      }
    );

    router.delete(
      {
        path: '/api/todos/{id}',
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();
          await savedObjectsClient.delete(SAVED_OBJECTS_TYPE, request.params.id);

          return response.ok();
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
        path: '/api/todos/reorder',
        options: { access: 'public' },
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out of authorization because it is only intended for test use',
          },
        },
        validate: {
          body: schema.object({
            order: schema.arrayOf(
              schema.object({
                id: schema.string(),
                order: schema.number(),
              })
            ),
          }),
        },
      },
      async (context, request, response) => {
        try {
          const savedObjectsClient = (await context.core).savedObjects.getClient();
          const { order } = request.body;

          await Promise.all(
            order.map(({ id, order: orderValue }) =>
              savedObjectsClient.update(SAVED_OBJECTS_TYPE, id, { order: orderValue })
            )
          );

          return response.ok({ body: { success: true } });
        } catch (error) {
          return response.badRequest({ body: error.message });
        }
      }
    );
  }

  public start(_core: CoreStart) {}

  public stop() {}
}
