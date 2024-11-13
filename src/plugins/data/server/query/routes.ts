/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { CoreSetup } from '@kbn/core/server';
import { reportServerError } from '@kbn/kibana-utils-plugin/server';
import { SavedQueryRouteHandlerContext } from './route_handler_context';
import { SAVED_QUERY_BASE_URL } from '../../common/constants';

const SAVED_QUERY_ID_CONFIG = schema.object({
  id: schema.string(),
});
const SAVED_QUERY_ATTRS_CONFIG = schema.object({
  title: schema.string(),
  description: schema.string(),
  query: schema.object({
    query: schema.oneOf([schema.string(), schema.object({}, { unknowns: 'allow' })]),
    language: schema.string(),
  }),
  filters: schema.maybe(schema.arrayOf(schema.any())),
  timefilter: schema.maybe(schema.any()),
});

const savedQueryResponseSchema = () =>
  schema.object({
    id: schema.string(),
    attributes: SAVED_QUERY_ATTRS_CONFIG,
    namespaces: schema.maybe(schema.arrayOf(schema.string())),
  });

const access = 'internal';
const version = '1';

export function registerSavedQueryRoutes({ http }: CoreSetup): void {
  const router = http.createRouter<SavedQueryRouteHandlerContext>();

  router.versioned.post({ path: `${SAVED_QUERY_BASE_URL}/_is_duplicate_title`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:read'],
        },
      },
      validate: {
        request: {
          body: schema.object({
            title: schema.string(),
            id: schema.maybe(schema.string()),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                isDuplicate: schema.boolean(),
              }),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const isDuplicate = await savedQuery.isDuplicateTitle(request.body);
        return response.ok({ body: { isDuplicate } });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.post({ path: `${SAVED_QUERY_BASE_URL}/_create`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:manage'],
        },
      },
      validate: {
        request: {
          body: SAVED_QUERY_ATTRS_CONFIG,
        },
        response: {
          200: {
            body: savedQueryResponseSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const body = await savedQuery.create(request.body);
        return response.ok({ body });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.put({ path: `${SAVED_QUERY_BASE_URL}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:manage'],
        },
      },
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
          body: SAVED_QUERY_ATTRS_CONFIG,
        },
        response: {
          200: {
            body: savedQueryResponseSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        const body = await savedQuery.update(id, request.body);
        return response.ok({ body });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.get({ path: `${SAVED_QUERY_BASE_URL}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:read'],
        },
      },
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
        },
        response: {
          200: {
            body: savedQueryResponseSchema,
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        const body = await savedQuery.get(id);
        return response.ok({ body });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.get({ path: `${SAVED_QUERY_BASE_URL}/_count`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:read'],
        },
      },
      validate: {
        request: {},
        response: {
          200: {
            body: () => schema.number(),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const count: number = await savedQuery.count();
        return response.ok({ body: `${count}` });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.post({ path: `${SAVED_QUERY_BASE_URL}/_find`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:read'],
        },
      },
      validate: {
        request: {
          body: schema.object({
            search: schema.string({ defaultValue: '' }),
            perPage: schema.number({ defaultValue: 50 }),
            page: schema.number({ defaultValue: 1 }),
          }),
        },
        response: {
          200: {
            body: () =>
              schema.object({
                total: schema.number(),
                savedQueries: schema.arrayOf(savedQueryResponseSchema()),
              }),
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        const savedQuery = await context.savedQuery;
        const body = await savedQuery.find(request.body);
        return response.ok({ body });
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );

  router.versioned.delete({ path: `${SAVED_QUERY_BASE_URL}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: {
          requiredPrivileges: ['savedQuery:manage'],
        },
      },
      validate: {
        request: {
          params: SAVED_QUERY_ID_CONFIG,
        },
        response: {
          200: {
            body: () => schema.never(),
          },
        },
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const savedQuery = await context.savedQuery;
        await savedQuery.delete(id);
        return response.ok();
      } catch (e) {
        const err = e.output?.payload ?? e;
        return reportServerError(response, err);
      }
    }
  );
}
