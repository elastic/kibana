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
import { NpreClient } from '../npre/npre_client';

export const registerGetNpreValueRoute = (
  router: IRouter,
  { logger }: PluginInitializerContext
) => {
  router.get(
    {
      path: '/internal/cps/project_routing/{projectRoutingName}',
      validate: {
        params: schema.object({
          projectRoutingName: schema.string({ maxLength: 10000 }),
        }),
      },
      security: {
        authz: {
          requiredPrivileges: [
            // this will end up being just read_project_routing but it is not implemented yet.
            'cluster:monitor/project_routing/get',
          ],
        },
      },
    },
    async (requestHandlerContext, request, response) => {
      try {
        const core = await requestHandlerContext.core;

        const npreClient = new NpreClient(logger.get(), core.elasticsearch.client);

        const value = await npreClient.getNpre(request.params.projectRoutingName);

        if (value === undefined) {
          return response.notFound();
        }

        return response.ok({ body: value });
      } catch (error) {
        logger.get().info(error);
        throw error;
      }
    }
  );
};
