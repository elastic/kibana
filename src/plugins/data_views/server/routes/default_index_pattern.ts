/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';
import { handleErrors } from './util/handle_errors';

export const registerManageDefaultIndexPatternRoutes = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.get(
    {
      path: '/api/index_patterns/default',
      validate: {},
    },
    handleErrors(async (ctx, req, res) => {
      const savedObjectsClient = ctx.core.savedObjects.client;
      const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
      const [, , { indexPatternsServiceFactory }] = await getStartServices();
      const indexPatternsService = await indexPatternsServiceFactory(
        savedObjectsClient,
        elasticsearchClient
      );

      const defaultIndexPatternId = await indexPatternsService.getDefaultId();

      return res.ok({
        body: {
          index_pattern_id: defaultIndexPatternId,
        },
      });
    })
  );

  router.post(
    {
      path: '/api/index_patterns/default',
      validate: {
        body: schema.object({
          index_pattern_id: schema.nullable(
            schema.string({
              minLength: 1,
              maxLength: 1_000,
            })
          ),
          force: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    handleErrors(async (ctx, req, res) => {
      const savedObjectsClient = ctx.core.savedObjects.client;
      const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
      const [, , { indexPatternsServiceFactory }] = await getStartServices();
      const indexPatternsService = await indexPatternsServiceFactory(
        savedObjectsClient,
        elasticsearchClient
      );

      const newDefaultId = req.body.index_pattern_id;
      const force = req.body.force;

      await indexPatternsService.setDefault(newDefaultId, force);

      return res.ok({
        body: {
          acknowledged: true,
        },
      });
    })
  );
};
