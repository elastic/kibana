/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { handleErrors } from './util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../plugin';

export const registerDeleteIndexPatternRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
) => {
  router.delete(
    {
      path: '/api/index_patterns/index_pattern/{id}',
      validate: {
        params: schema.object(
          {
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          },
          { unknowns: 'allow' }
        ),
      },
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
        const id = req.params.id;

        await indexPatternsService.delete(id);

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
        });
      })
    )
  );
};
