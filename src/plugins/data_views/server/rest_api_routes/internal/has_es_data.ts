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
import { DEFAULT_ASSETS_TO_IGNORE } from '../../../common';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

const patterns = ['*', '-.*'].concat(
  DEFAULT_ASSETS_TO_IGNORE.DATA_STREAMS_TO_IGNORE.map((ds) => `-${ds}`)
);

const crossClusterPatterns = patterns.map((ds) => `*:${ds}`);

const localAndCrossClusterPatterns = patterns.concat(crossClusterPatterns);

export const handler: (callResolveCluster: boolean) => Handler =
  (callResolveCluster: boolean) => async (ctx: RequestHandlerContext, req, res) => {
    const core = await ctx.core;
    const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
    let hasEsData = false;

    if (callResolveCluster) {
      const response = await elasticsearchClient.indices.resolveCluster({
        name: localAndCrossClusterPatterns,
        ignore_unavailable: true,
      });

      hasEsData = !!Object.values(response).find((cluster) => cluster.matching_indices);
    } else {
      const {
        indices,
        aliases,
        data_streams: dataStreams,
      } = await elasticsearchClient.indices.resolveIndex({
        name: patterns,
        // the client doesn't support this parameter yet, enable when it does
        // ignore_unavailable: true,
      });

      hasEsData = indices.length > 0 || dataStreams.length > 0 || aliases.length > 0;
    }

    return res.ok({ body: { hasEsData } });
  };

export const registerHasEsDataRoute = (router: IRouter, callResolveCluster: boolean): void => {
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
      handler(callResolveCluster)
    );
};
