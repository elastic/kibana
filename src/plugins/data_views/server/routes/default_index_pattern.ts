/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import { handleErrors } from './util/handle_errors';
import { SERVICE_PATH, SERVICE_PATH_LEGACY, SERVICE_KEY, SERVICE_KEY_LEGACY } from '../constants';

const manageDefaultIndexPatternRoutesFactory =
  (path: string, serviceKey: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection: UsageCounter
  ) => {
    router.get(
      {
        path,
        validate: {},
      },
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { dataViewsServiceFactory }] = await getStartServices();
        usageCollection.incrementCounter({ counterName: path });
        const indexPatternsService = await dataViewsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );

        const defaultIndexPatternId = await indexPatternsService.getDefaultId();

        return res.ok({
          body: {
            [`${serviceKey}_id`]: defaultIndexPatternId,
          },
        });
      })
    );

    router.post(
      {
        path,
        validate: {
          body: schema.object({
            [`${serviceKey}_id`]: schema.nullable(
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
        const [, , { dataViewsServiceFactory }] = await getStartServices();
        const indexPatternsService = await dataViewsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );

        const newDefaultId = req.body[`${serviceKey}_id`] as string;
        const force = req.body.force as boolean;

        await indexPatternsService.setDefault(newDefaultId, force);

        return res.ok({
          body: {
            acknowledged: true,
          },
        });
      })
    );
  };

export const registerManageDefaultDataViewRoute = manageDefaultIndexPatternRoutesFactory(
  `${SERVICE_PATH}/default`,
  SERVICE_KEY
);

export const registerManageDefaultDataViewRouteLegacy = manageDefaultIndexPatternRoutesFactory(
  `${SERVICE_PATH_LEGACY}/default`,
  SERVICE_KEY_LEGACY
);
