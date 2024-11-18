/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { KibanaResponseFactory, VersionedRoute } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { DEFAULT_ASSETS_TO_IGNORE } from '../../../common';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

const patterns = ['*', '-.*'].concat(
  DEFAULT_ASSETS_TO_IGNORE.DATA_STREAMS_TO_IGNORE.map((ds) => `-${ds}`)
);

const crossClusterPatterns = patterns.map((ds) => `*:${ds}`);

const resolveClusterTimeout = '5s';

export const handler: Handler = async (ctx: RequestHandlerContext, _, res) => {
  const core = await ctx.core;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;

  const hasLocalEsData = await hasEsData({
    elasticsearchClient,
    res,
    matchPatterns: patterns,
    timeoutReason: 'local_data_timeout',
  });

  if (hasLocalEsData) {
    return hasLocalEsData;
  }

  const hasCrossClusterEsData = await hasEsData({
    elasticsearchClient,
    res,
    matchPatterns: crossClusterPatterns,
    timeoutReason: 'cross_cluster_data_timeout',
  });

  if (hasCrossClusterEsData) {
    return hasCrossClusterEsData;
  }

  return res.ok({ body: { hasEsData: false } });
};

const hasEsData = async ({
  elasticsearchClient,
  res,
  matchPatterns,
  timeoutReason,
}: {
  elasticsearchClient: ElasticsearchClient;
  res: KibanaResponseFactory;
  matchPatterns: string[];
  timeoutReason: string;
}) => {
  try {
    const response = await elasticsearchClient.indices.resolveCluster(
      {
        name: matchPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: resolveClusterTimeout }
    );

    const hasData = !!Object.values(response).find((cluster) => cluster.matching_indices);

    if (hasData) {
      return res.ok({ body: { hasEsData: true } });
    }
  } catch (e) {
    if (e.name === 'TimeoutError') {
      return res.badRequest({
        body: {
          message: 'Timeout while checking for Elasticsearch data',
          attributes: { failureReason: timeoutReason },
        },
      });
    }

    return res.badRequest({
      body: {
        message: 'Error while checking for Elasticsearch data',
        attributes: { failureReason: 'unknown' },
      },
    });
  }
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
            400: {
              body: () =>
                schema.object({
                  message: schema.string(),
                  attributes: schema.object({
                    failureReason: schema.string(),
                  }),
                }),
            },
          },
        },
      },
      handler
    );
};
