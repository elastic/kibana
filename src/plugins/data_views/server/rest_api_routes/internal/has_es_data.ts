/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { KibanaResponseFactory, VersionedRoute } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { DEFAULT_ASSETS_TO_IGNORE, HasEsDataFailureReason } from '../../../common';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

export const patterns = ['*', '-.*'].concat(
  DEFAULT_ASSETS_TO_IGNORE.DATA_STREAMS_TO_IGNORE.map((ds) => `-${ds}`)
);

export const crossClusterPatterns = patterns.map((ds) => `*:${ds}`);

export const createHandler =
  (parentLogger: Logger, hasEsDataTimeout: number): Handler =>
  async (ctx, _, res) => {
    const logger = parentLogger.get('hasEsData');
    const core = await ctx.core;
    const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
    const commonParams: Omit<HasEsDataParams, 'matchPatterns' | 'timeoutReason'> = {
      elasticsearchClient,
      logger,
      res,
      hasEsDataTimeout,
    };

    const localDataResponse = await hasEsData({
      ...commonParams,
      matchPatterns: patterns,
      timeoutReason: HasEsDataFailureReason.localDataTimeout,
    });

    if (localDataResponse) {
      return localDataResponse;
    }

    const remoteDataResponse = await hasEsData({
      ...commonParams,
      matchPatterns: crossClusterPatterns,
      timeoutReason: HasEsDataFailureReason.remoteDataTimeout,
    });

    if (remoteDataResponse) {
      return remoteDataResponse;
    }

    return res.ok({ body: { hasEsData: false } });
  };

interface HasEsDataParams {
  elasticsearchClient: ElasticsearchClient;
  logger: Logger;
  res: KibanaResponseFactory;
  matchPatterns: string[];
  hasEsDataTimeout: number;
  timeoutReason: HasEsDataFailureReason;
}

const timeoutMessage = 'Timeout while checking for Elasticsearch data';
const errorMessage = 'Error while checking for Elasticsearch data';

const hasEsData = async ({
  elasticsearchClient,
  logger,
  res,
  matchPatterns,
  hasEsDataTimeout,
  timeoutReason,
}: HasEsDataParams) => {
  try {
    const response = await elasticsearchClient.indices.resolveCluster(
      {
        name: matchPatterns,
        allow_no_indices: true,
        ignore_unavailable: true,
      },
      { requestTimeout: hasEsDataTimeout === 0 ? undefined : hasEsDataTimeout }
    );

    const hasData = Object.values(response).some((cluster) => cluster.matching_indices);

    if (hasData) {
      return res.ok({ body: { hasEsData: true } });
    }
  } catch (e) {
    if (e.name === 'TimeoutError') {
      const warningMessage =
        `${timeoutMessage}: ${timeoutReason}. Current timeout value is ${hasEsDataTimeout}ms. ` +
        `Use "data_views.hasEsDataTimeout" in kibana.yml to change it, or set to 0 to disable timeouts.`;

      logger.warn(warningMessage);

      return res.customError({
        statusCode: 504,
        body: {
          message: timeoutMessage,
          attributes: { failureReason: timeoutReason },
        },
      });
    }

    logger.error(e);

    return res.customError({
      statusCode: 500,
      body: {
        message: errorMessage,
        attributes: { failureReason: HasEsDataFailureReason.unknown },
      },
    });
  }
};

export const registerHasEsDataRoute = (
  router: IRouter,
  logger: Logger,
  hasEsDataTimeout: number
): void => {
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
      createHandler(logger, hasEsDataTimeout)
    );
};
