/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { Logger } from '@kbn/core/server';
import { reportServerError } from '@kbn/kibana-utils-plugin/server';
import { DataPluginRouter } from '../types';
import {
  SearchSessionRestResponse,
  SearchSessionStatusRestResponse,
  SearchSessionsFindRestResponse,
  SearchSessionsUpdateRestResponse,
} from './response_types';
import {
  searchSessionSchema,
  searchSessionStatusSchema,
  searchSessionsFindSchema,
  searchSessionsUpdateSchema,
} from './response_schema';

const access = 'internal';
const requiredPrivileges = ['store_search_session'];
const pathPrefix = '/internal/session';
export const INITIAL_SEARCH_SESSION_REST_VERSION = '1';
const version = INITIAL_SEARCH_SESSION_REST_VERSION;

const idAndAttrsOnly = (so?: SearchSessionRestResponse) =>
  so && { id: so.id, attributes: so.attributes };

export function registerSessionRoutes(router: DataPluginRouter, logger: Logger): void {
  router.versioned.post({ path: pathPrefix, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
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
        response: {
          200: {
            body: () => schema.maybe(searchSessionSchema()),
          },
        },
      },
    },
    async (context, request, res) => {
      const { sessionId, name, expires, initialState, restoreState, appId, locatorId } =
        request.body;

      try {
        const searchContext = await context.search;

        const response = await searchContext.saveSession(sessionId, {
          name,
          appId,
          expires,
          locatorId,
          initialState,
          restoreState,
        });

        const body: SearchSessionRestResponse | undefined = idAndAttrsOnly(response);

        return res.ok({ body });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.versioned.get({ path: `${pathPrefix}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
        },
        response: {
          200: {
            body: searchSessionSchema,
          },
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const searchContext = await context.search;
        const response: SearchSessionRestResponse = await searchContext!.getSession(id);
        const body = idAndAttrsOnly(response);

        return res.ok({ body });
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.versioned.get({ path: `${pathPrefix}/{id}/status`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
        },
        response: {
          200: {
            body: searchSessionStatusSchema,
          },
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const searchContext = await context.search;
        const response: SearchSessionStatusRestResponse = await searchContext!.getSessionStatus(id);

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

  router.versioned.post({ path: `${pathPrefix}/_find`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
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
        response: {
          200: {
            body: searchSessionsFindSchema,
          },
        },
      },
    },
    async (context, request, res) => {
      const { page, perPage, sortField, sortOrder, filter, searchFields, search } = request.body;
      try {
        const searchContext = await context.search;
        const response: SearchSessionsFindRestResponse = await searchContext!.findSessions({
          page,
          perPage,
          sortField,
          sortOrder,
          filter,
          searchFields,
          search,
        });

        const body = {
          total: response.total,
          saved_objects: response.saved_objects.map(idAndAttrsOnly),
          statuses: response.statuses,
        };

        return res.ok({ body });
      } catch (err) {
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.versioned.delete({ path: `${pathPrefix}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const searchContext = await context.search;
        await searchContext.deleteSession(id);

        return res.ok();
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.versioned.post({ path: `${pathPrefix}/{id}/cancel`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      try {
        const searchContext = await context.search;
        await searchContext.cancelSession(id);

        return res.ok();
      } catch (e) {
        const err = e.output?.payload || e;
        logger.error(err);
        return reportServerError(res, err);
      }
    }
  );

  router.versioned.put({ path: `${pathPrefix}/{id}`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
          body: schema.object({
            name: schema.maybe(schema.string()),
            expires: schema.maybe(schema.string()),
          }),
        },
        response: {
          200: {
            body: searchSessionsUpdateSchema,
          },
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { name, expires } = request.body;
      try {
        const searchContext = await context.search;
        const response: SearchSessionsUpdateRestResponse = await searchContext.updateSession(id, {
          name,
          expires,
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

  router.versioned.post({ path: `${pathPrefix}/{id}/_extend`, access }).addVersion(
    {
      version,
      security: {
        authz: { requiredPrivileges },
      },
      validate: {
        request: {
          params: schema.object({
            id: schema.string(),
          }),
          body: schema.object({
            expires: schema.string(),
          }),
        },
        response: {
          200: {
            body: searchSessionsUpdateSchema,
          },
        },
      },
    },
    async (context, request, res) => {
      const { id } = request.params;
      const { expires } = request.body;
      try {
        const searchContext = await context.search;
        const response: SearchSessionsUpdateRestResponse = await searchContext.extendSession(
          id,
          new Date(expires)
        );

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
