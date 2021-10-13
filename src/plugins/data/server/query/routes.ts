/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { isFilters } from '@kbn/es-query';
import { CoreSetup } from 'kibana/server';
import { isQuery } from '../../common';
import { SavedQueryRouteHandlerContext } from './route_handler_context';

const SAVED_QUERY_PATH = '/api/saved_query';

export function registerSavedQueryRoutes({ http }: CoreSetup): void {
  const router = http.createRouter<SavedQueryRouteHandlerContext>();

  router.post(
    {
      path: `${SAVED_QUERY_PATH}/_create`,
      validate: {
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          query: schema.object({
            query: schema.oneOf([schema.string(), schema.object({}, { unknowns: 'allow' })]),
            language: schema.string(),
          }),
          filters: schema.maybe(schema.arrayOf(schema.any())),
          timefilter: schema.maybe(schema.any()),
        }),
      },
    },
    async (context, request, response) => {
      const { title, query, filters = [] } = request.body;

      // TODO: isTimefilter(timefilter)

      if (!isQuery(query)) {
        // TODO: Handle properly
        throw new Error(`Invalid query: ${query}`);
      }

      if (!isFilters(filters)) {
        // TODO: Handle properly
        throw new Error(`Invalid filters: ${filters}`);
      }

      if (!title.trim().length) {
        // TODO: Handle properly
        throw new Error('Cannot create saved query without a title');
      }

      const body = await context.savedQuery.create(request.body);
      return response.ok({ body });
    }
  );

  router.get(
    {
      path: `${SAVED_QUERY_PATH}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const body = await context.savedQuery.get(id);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.get(
    {
      path: `${SAVED_QUERY_PATH}/_count`,
      validate: {},
    },
    async (context, request, response) => {
      try {
        const count = await context.savedQuery.count();
        return response.ok({ body: `${count}` });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.post(
    {
      path: `${SAVED_QUERY_PATH}/_find`,
      validate: {
        body: schema.object({
          search: schema.string({ defaultValue: '' }),
          perPage: schema.number({ defaultValue: 50 }),
          page: schema.number({ defaultValue: 1 }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const body = await context.savedQuery.find(request.body);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );

  router.delete(
    {
      path: `${SAVED_QUERY_PATH}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { id } = request.params;
      try {
        const body = await context.savedQuery.delete(id);
        return response.ok({ body });
      } catch (e) {
        // TODO: Handle properly
        return response.customError(e);
      }
    }
  );
}
