/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import {
  LOOKUP_INDEX_CREATE_ROUTE,
  LOOKUP_INDEX_PRIVILEGES_ROUTE,
  LOOKUP_INDEX_RECREATE_ROUTE,
  LOOKUP_INDEX_UPDATE_ROUTE,
  LOOKUP_INDEX_UPDATE_MAPPINGS_ROUTE,
} from '@kbn/esql-types';

export const registerLookupIndexRoutes = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: `${LOOKUP_INDEX_UPDATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          // maxSize is added here to prevent DoS vulnerabilities https://github.com/elastic/kibana/pull/245533,
          operations: schema.arrayOf(schema.any(), { maxSize: 1000 }),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Updates an index with bulk operations',
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const indexName = request.params.indexName;

        const result = await client.bulk({
          index: indexName,
          operations: request.body.operations,
        });

        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );

  router.post(
    {
      path: `${LOOKUP_INDEX_CREATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Creates an index with lookup mode',
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const indexName = request.params.indexName;

        const result = await client.indices.create({
          index: indexName,
          settings: {
            mode: 'lookup',
          },
        });

        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );

  router.post(
    {
      path: `${LOOKUP_INDEX_RECREATE_ROUTE}/{indexName}`,
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Recreates an index with lookup mode, used to reset the mapping of the index.',
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const core = await requestHandlerContext.core;
        const client = core.elasticsearch.client.asCurrentUser;

        const indexName = request.params.indexName;

        await client.indices.delete({
          index: indexName,
          ignore_unavailable: true,
        });

        const result = await client.indices.create({
          index: indexName,
          settings: {
            mode: 'lookup',
          },
        });

        return response.ok({
          body: result,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );

  router.get(
    {
      path: LOOKUP_INDEX_PRIVILEGES_ROUTE,
      validate: {
        query: schema.object({ indexName: schema.maybe(schema.string()) }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      options: {
        description: 'Checks if the user has privileges to create, read and write to an index',
      },
    },
    async (requestHandlerContext, req, res) => {
      const { indexName } = req.query;
      const indices: string[] = indexName ? indexName.split(',') : [];

      try {
        const core = await requestHandlerContext.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const { index: indexPrivileges = {} } = await esClient.security.hasPrivileges({
          index: [
            {
              names: ['*', ...indices],
              privileges: ['create_index', 'read', 'write', 'delete_index'],
            },
          ],
        });

        return res.ok({
          body: indexPrivileges,
        });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );

  router.put(
    {
      path: `${LOOKUP_INDEX_UPDATE_MAPPINGS_ROUTE}/{indexName}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {
        body: schema.object({
          properties: schema.object({}, { unknowns: 'allow' }),
        }),
        params: schema.object({
          indexName: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const core = await requestHandlerContext.core;
      const esClient = core.elasticsearch.client.asCurrentUser;

      const { indexName } = request.params;

      try {
        const responseBody = await esClient.indices.putMapping({
          properties: request.body.properties,
          index: indexName,
        });
        return response.ok({ body: responseBody });
      } catch (error) {
        logger.get().debug(error);
        throw error;
      }
    }
  );
};
