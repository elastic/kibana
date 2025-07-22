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

export const registerLookupIndexRoutes = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.post(
    {
      path: '/internal/esql/lookup_index/{indexName}/update',
      validate: {
        params: schema.object({
          indexName: schema.string(),
        }),
        body: schema.object({
          operations: schema.arrayOf(schema.any()),
        }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
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
      path: '/internal/esql/lookup_index/{indexName}',
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
};
