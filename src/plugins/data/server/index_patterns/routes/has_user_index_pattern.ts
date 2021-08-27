/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { StartServicesAccessor } from '../../../../../core/server';
import type { IRouter } from '../../../../../core/server/http/router/router';
import type { DataPluginStart, DataPluginStartDependencies } from '../../plugin';
import { handleErrors } from './util/handle_errors';

export const registerHasUserIndexPatternRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.get(
    {
      path: '/api/index_patterns/has_user_index_pattern',
      validate: {},
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatterns }] = await getStartServices();
        const indexPatternsService = await indexPatterns.indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient
        );

        return res.ok({
          body: {
            result: await indexPatternsService.hasUserIndexPattern(),
          },
        });
      })
    )
  );
};
