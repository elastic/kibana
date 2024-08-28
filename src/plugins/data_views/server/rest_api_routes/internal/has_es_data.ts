/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { VersionedRoute } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

export const handler: Handler = async (ctx: RequestHandlerContext, req, res) => {
  const core = await ctx.core;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const response = await elasticsearchClient.indices.resolveCluster({
    // todo - better code for this, exclude these when on other clusters?
    name: '*,-.*,-logs-enterprise_search.api-default,-logs-enterprise_search.audit-default',
    allow_no_indices: true,
    ignore_unavailable: true,
  });

  const hasEsData = !!Object.values(response).find((cluster) => !!cluster.matching_indices);

  return res.ok({ body: { hasEsData } });
};

export const registerHasEsDataRoute = (router: IRouter): void => {
  router.versioned
    .get({
      path: '/internal/data_views/has_es_data',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          response: {
            200: {
              body: () =>
                schema.object({
                  hasEsData: schema.boolean(),
                }),
            },
          },
        },
      },
      handler
    );
};
