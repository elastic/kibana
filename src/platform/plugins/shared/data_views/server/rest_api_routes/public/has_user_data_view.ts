/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  IRouter,
  StartServicesAccessor,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { hasUserDataView as hasUserDataViewCheck } from '../../has_user_data_view';
import { handleErrors } from './util/handle_errors';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import { SERVICE_PATH, SERVICE_PATH_LEGACY } from '../../constants';

interface HasUserDataViewArgs {
  soClient: SavedObjectsClientContract;
  esClient: ElasticsearchClient;
  usageCollection?: UsageCounter;
  counterName: string;
}

export const hasUserDataView = async ({
  soClient,
  esClient,
  usageCollection,
  counterName,
}: HasUserDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return hasUserDataViewCheck({ esClient, soClient });
};

const hasUserDataViewRouteFactory =
  (path: string) =>
  (
    router: IRouter,
    _getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned
      .get({
        path,
        access: 'internal',
        security: {
          authz: {
            enabled: false,
            reason: 'Authorization provided by saved objects client',
          },
        },
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: {},
            response: {
              200: {
                body: () =>
                  schema.object({
                    result: schema.boolean(),
                  }),
              },
            },
          },
        },
        router.handleLegacyErrors(
          handleErrors(async (ctx, req, res) => {
            const core = await ctx.core;
            const savedObjectsClient = core.savedObjects.client;
            const elasticsearchClient = core.elasticsearch.client.asCurrentUser;

            const result = await hasUserDataView({
              soClient: savedObjectsClient,
              esClient: elasticsearchClient,
              usageCollection,
              counterName: `${req.route.method} ${path}`,
            });

            const body: { result: boolean } = { result };

            return res.ok({
              body,
            });
          })
        )
      );
  };

export const registerHasUserDataViewRoute = hasUserDataViewRouteFactory(
  `${SERVICE_PATH}/has_user_data_view`
);

export const registerHasUserDataViewRouteLegacy = hasUserDataViewRouteFactory(
  `${SERVICE_PATH_LEGACY}/has_user_index_pattern`
);
