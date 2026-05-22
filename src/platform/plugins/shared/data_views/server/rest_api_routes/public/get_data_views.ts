/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { DataViewsService } from '../../../common';
import { handleErrors } from './util/handle_errors';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  SERVICE_KEY,
  SERVICE_PATH,
  INITIAL_REST_VERSION,
  GET_DATA_VIEWS_SUMMARY,
  GET_DATA_VIEWS_DESCRIPTION,
} from '../../constants';
import type { DataViewListItemRestResponse } from '../route_types';

interface GetDataViewsArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
}

export const getDataViews = async ({
  dataViewsService,
  usageCollection,
  counterName,
}: GetDataViewsArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.getIdsWithTitle();
};

const getDataViewsRouteFactory =
  (path: string, serviceKey: string, summary?: string, description?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    const responseValidation = () => {
      const dataViewListSchema = schema.arrayOf(
        schema.object({
          id: schema.string({
            meta: { description: 'The unique identifier for the data view.' },
          }),
          namespaces: schema.maybe(
            schema.arrayOf(schema.string(), {
              meta: {
                description: 'The Kibana namespaces (spaces) where this data view is available.',
              },
            })
          ),
          title: schema.string({
            meta: {
              description:
                'The comma-separated list of data streams, indices, and aliases that the data view matches.',
            },
          }),
          type: schema.maybe(
            schema.string({
              meta: {
                description: 'The type of data view. Set to `rollup` for rollup data views.',
              },
            })
          ),
          typeMeta: schema.maybe(
            schema.object(
              {},
              {
                unknowns: 'allow',
                meta: {
                  description:
                    'Type-specific metadata. For rollup data views, contains information about rollup jobs and their capabilities.',
                },
              }
            )
          ),
          name: schema.maybe(
            schema.string({
              meta: { description: 'The human-readable display name for the data view.' },
            })
          ),
          timeFieldName: schema.maybe(
            schema.string({
              meta: { description: 'The timestamp field name used for time-based data views.' },
            })
          ),
          managed: schema.maybe(
            schema.boolean({
              meta: { description: 'Indicates whether this data view is managed by Kibana.' },
            })
          ),
        })
      );
      return schema.object({ [serviceKey]: dataViewListSchema });
    };

    router.versioned
      .get({
        path,
        access: 'public',
        summary,
        description,
        security: {
          authz: {
            enabled: false,
            reason: 'Authorization provided by saved objects client',
          },
        },
      })
      .addVersion(
        {
          version: INITIAL_REST_VERSION,
          validate: {
            request: {},
            response: { 200: { body: responseValidation } },
          },
        },
        router.handleLegacyErrors(
          handleErrors(async (ctx, req, res) => {
            const core = await ctx.core;
            const savedObjectsClient = core.savedObjects.client;
            const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
            const [, , { dataViewsServiceFactory }] = await getStartServices();
            const dataViewsService = await dataViewsServiceFactory(
              savedObjectsClient,
              elasticsearchClient,
              req
            );

            const dataViews = await getDataViews({
              dataViewsService,
              usageCollection,
              counterName: `${req.route.method} ${path}`,
            });

            const body: Record<string, DataViewListItemRestResponse[]> = {
              [serviceKey]: dataViews,
            };

            return res.ok({
              headers: {
                'content-type': 'application/json',
              },
              body,
            });
          })
        )
      );
  };

export const registerGetDataViewsRoute = getDataViewsRouteFactory(
  SERVICE_PATH,
  SERVICE_KEY,
  GET_DATA_VIEWS_SUMMARY,
  GET_DATA_VIEWS_DESCRIPTION
);
