/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { reportServerError } from '@kbn/kibana-utils-plugin/server';
import { DataPluginRouter } from '../types';

const STORE_SEARCH_SESSIONS_ROLE_TAG = `access:store_search_session`;

export function registerSessionRoutes(router: DataPluginRouter, logger: Logger): void {
  router.post(
    {
      path: '/internal/session',
      validate: {
        body: schema.object({
          sessionId: schema.string(),
          name: schema.string(),
          appId: schema.string(),
          expires: schema.maybe(schema.string()),
          locatorId: schema.string(),
          initialState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          restoreState: schema.maybe(schema.object({}, { unknowns: 'allow' })),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { sessionId, name, expires, initialState, restoreState, appId, locatorId } =
        request.body;

      try {
        const response = await context.search!.saveSession(sessionId, {
          name,
          appId,
          expires,
          locatorId,
          initialState,
          restoreState,
        });

        return res.ok({
          body: response,
        });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.get(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const response = await context.search!.getSession(id);

        return res.ok({
          body: response,
        });
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.post(
    {
      path: '/internal/session/_find',
      validate: {
        body: schema.object({
          page: schema.maybe(schema.number()),
          perPage: schema.maybe(schema.number()),
          sortField: schema.maybe(schema.string()),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
          filter: schema.maybe(schema.string()),
          searchFields: schema.maybe(schema.arrayOf(schema.string())),
          search: schema.maybe(schema.string()),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { page, perPage, sortField, sortOrder, filter, searchFields, search } = request.body;
      try {
        const response = await context.search!.findSessions({
          page,
          perPage,
          sortField,
          sortOrder,
          filter,
          searchFields,
          search,
        });

        return res.ok({
          body: response,
        });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.delete(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        await context.search!.deleteSession(id);

        return res.ok();
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.post(
    {
      path: '/internal/session/{id}/cancel',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        await context.search!.cancelSession(id);

        return res.ok();
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.put(
    {
      path: '/internal/session/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          name: schema.maybe(schema.string()),
          expires: schema.maybe(schema.string()),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { name, expires } = request.body;
      try {
        const response = await context.search!.updateSession(id, { name, expires });

        return res.ok({
          body: response,
        });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.post(
    {
      path: '/internal/session/{id}/_extend',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          expires: schema.string(),
        }),
      },
      options: {
        tags: [STORE_SEARCH_SESSIONS_ROLE_TAG],
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { expires } = request.body;
      try {
        const response = await context.search!.extendSession(id, new Date(expires));

        return res.ok({
          body: response,
        });
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );
}
