/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { ErrorIndexPatternFieldNotFound } from '../../../error';
import { handleErrors } from '../util/handle_errors';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../../types';
import { INITIAL_REST_VERSION } from '../../../constants';

export const registerDeleteScriptedFieldRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.versioned
    .delete({
      path: '/api/index_patterns/index_pattern/{id}/scripted_field/{name}',
      access: 'public',
    })
    .addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
            params: schema.object(
              {
                id: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                }),
                name: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                }),
              },
              { unknowns: 'allow' }
            ),
          },
          response: {
            200: {
              body: () => schema.never(),
            },
          },
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const core = await ctx.core;
          const savedObjectsClient = core.savedObjects.client;
          const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const id = req.params.id;
          const name = req.params.name;

          const indexPattern = await indexPatternsService.getDataViewLazy(id);
          const field = await indexPattern.getFieldByName(name);

          if (!field) {
            throw new ErrorIndexPatternFieldNotFound(id, name);
          }

          if (!field.scripted) {
            throw new Error('Only scripted fields can be deleted.');
          }

          indexPattern.removeScriptedField(name);

          await indexPatternsService.updateSavedObject(indexPattern);

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
          });
        })
      )
    );
};
