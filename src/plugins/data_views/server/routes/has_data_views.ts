/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '@kbn/core/server';
import { getDataViews, hasUserDataView } from '../has_user_data_view';

export const registerHasDataViewsRoute = (router: IRouter): void => {
  router.get(
    {
      path: '/internal/data_views/has_data_views',
      validate: {},
    },
    async (ctx, req, res) => {
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
      const response = {
        hasDataView: dataViews.total > 0,
        hasUserDataView: hasUserDataViewResult,
      };
      return res.ok({ body: response });
    }
  );
};
