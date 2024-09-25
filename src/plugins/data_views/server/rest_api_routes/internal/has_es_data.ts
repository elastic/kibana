/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { VersionedRoute } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { DEFAULT_ASSETS_TO_IGNORE } from '../../../common';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

const patterns = ['*', '-.*'].concat(
  DEFAULT_ASSETS_TO_IGNORE.DATA_STREAMS_TO_IGNORE.map((ds) => `-${ds}`)
);

const crossClusterPatterns = patterns.map((ds) => `*:${ds}`);

export const handler: Handler = async (ctx: RequestHandlerContext, req, res) => {
  const core = await ctx.core;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const response = await elasticsearchClient.indices.resolveCluster({
    name: patterns.concat(crossClusterPatterns),
    allow_no_indices: true,
    ignore_unavailable: true,
  });

  const hasEsData = !!Object.values(response).find((cluster) => cluster.matching_indices);

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
