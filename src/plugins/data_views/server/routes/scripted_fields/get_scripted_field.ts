/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import { SPECIFIC_SCRIPTED_FIELD_PATH, SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY } from '../../constants';

const getScriptedFieldRouteFactory =
  (path: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >
  ) => {
    router.get(
      {
        path,
        validate: {
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
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const savedObjectsClient = ctx.core.savedObjects.client;
          const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient
          );
          const id = req.params.id;
          const name = req.params.name;

          const indexPattern = await indexPatternsService.get(id);
          const field = indexPattern.fields.getByName(name);

          if (!field) {
            throw new ErrorIndexPatternFieldNotFound(id, name);
          }

          if (!field.scripted) {
            throw new Error('Only scripted fields can be retrieved.');
          }

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              field: field.toSpec(),
            }),
          });
        })
      )
    );
  };

export const registerGetScriptedFieldRoute = getScriptedFieldRouteFactory(
  SPECIFIC_SCRIPTED_FIELD_PATH
);

export const registerGetScriptedFieldRouteLegacy = getScriptedFieldRouteFactory(
  SPECIFIC_SCRIPTED_FIELD_PATH_LEGACY
);
