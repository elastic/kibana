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
import { getDataViews, hasUserDataView } from '../../has_user_data_view';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

export const handler: Handler = async (ctx: RequestHandlerContext, req, res) => {
  const core = await ctx.core;
  const savedObjectsClient = core.savedObjects.client;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const dataViews = await getDataViews({
    esClient: elasticsearchClient,
    soClient: savedObjectsClient,
  });
  const hasUserDataViewResult = await hasUserDataView(
    {
      esClient: elasticsearchClient,
      soClient: savedObjectsClient,
    },
    dataViews
  );
  const response: { hasDataView: boolean; hasUserDataView: boolean } = {
    hasDataView: dataViews.total > 0,
    hasUserDataView: hasUserDataViewResult,
  };
  return res.ok({ body: response });
};

export const registerHasDataViewsRoute = (router: IRouter): void => {
  router.versioned
    .get({
      path: '/internal/data_views/has_data_views',
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
                  hasDataView: schema.boolean(),
                  hasUserDataView: schema.boolean(),
                }),
            },
          },
        },
      },
      handler
    );
};
