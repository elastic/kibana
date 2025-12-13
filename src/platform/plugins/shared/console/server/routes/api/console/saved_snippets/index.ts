/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import {
  createSavedSnippet,
  updateSavedSnippet,
  deleteSavedSnippet,
  getSavedSnippet,
  findSavedSnippets,
} from './route_handlers';

const version = '2023-10-31';
const basePath = '/internal/console/saved_snippets';

const snippetAttributesSchema = schema.object({
  title: schema.string(),
  description: schema.maybe(schema.string()),
  query: schema.string(),
  endpoint: schema.maybe(schema.string()),
  method: schema.maybe(schema.string()),
  tags: schema.maybe(schema.arrayOf(schema.string())),
  createdBy: schema.maybe(schema.string()),
  updatedBy: schema.maybe(schema.string()),
});

export const registerSavedSnippetRoutes = (router: IRouter) => {
  // Create snippet
  router.versioned
    .post({
      path: basePath,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            body: snippetAttributesSchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const result = await createSavedSnippet(context, request.body);
          return response.ok({ body: result });
        } catch (error) {
          if (error.isBoom && error.output.statusCode === 409) {
            return response.conflict({ body: { message: error.message } });
          }
          return response.badRequest({ body: error });
        }
      }
    );

  // Find snippets
  router.versioned
    .post({
      path: `${basePath}/_find`,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            body: schema.object({
              search: schema.maybe(schema.string()),
              perPage: schema.maybe(schema.number()),
              page: schema.maybe(schema.number()),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { search, perPage, page } = request.body;
          const result = await findSavedSnippets(context, search, perPage, page);
          return response.ok({ body: result });
        } catch (error) {
          return response.badRequest({ body: error });
        }
      }
    );

  // Get snippet by ID
  router.versioned
    .get({
      path: `${basePath}/{id}`,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const result = await getSavedSnippet(context, request.params.id);
          return response.ok({ body: result });
        } catch (error) {
          if (error.isBoom && error.output.statusCode === 404) {
            return response.notFound({ body: { message: error.message } });
          }
          return response.badRequest({ body: error });
        }
      }
    );

  // Update snippet
  router.versioned
    .put({
      path: `${basePath}/{id}`,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
            body: snippetAttributesSchema,
          },
        },
      },
      async (context, request, response) => {
        try {
          const result = await updateSavedSnippet(context, request.params.id, request.body);
          return response.ok({ body: result });
        } catch (error) {
          if (error.isBoom && error.output.statusCode === 409) {
            return response.conflict({ body: { message: error.message } });
          }
          if (error.isBoom && error.output.statusCode === 404) {
            return response.notFound({ body: { message: error.message } });
          }
          return response.badRequest({ body: error });
        }
      }
    );

  // Delete snippet
  router.versioned
    .delete({
      path: `${basePath}/{id}`,
      access: 'public',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          await deleteSavedSnippet(context, request.params.id);
          return response.ok({ body: { success: true } });
        } catch (error) {
          if (error.isBoom && error.output.statusCode === 404) {
            return response.notFound({ body: { message: error.message } });
          }
          return response.badRequest({ body: error });
        }
      }
    );
};
