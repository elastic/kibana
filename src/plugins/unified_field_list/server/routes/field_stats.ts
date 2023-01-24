/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from '@kbn/core/server';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';
import { FIELD_STATS_API_PATH } from '../../common/constants';
import type { PluginStart } from '../types';
import {
  fetchAndCalculateFieldStats,
  SearchHandler,
  buildSearchParams,
} from '../../common/utils/field_stats_utils';

export async function initFieldStatsRoute(setup: CoreSetup<PluginStart>) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: FIELD_STATS_API_PATH,
      validate: {
        body: schema.object(
          {
            dslQuery: schema.object({}, { unknowns: 'allow' }),
            fromDate: schema.string(),
            toDate: schema.string(),
            dataViewId: schema.string(),
            fieldName: schema.string(),
            size: schema.maybe(schema.number()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = (await context.core).elasticsearch.client.asCurrentUser;
      const { fromDate, toDate, fieldName, dslQuery, size, dataViewId } = req.body;

      const [{ savedObjects, elasticsearch }, { dataViews }] = await setup.getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;
      const indexPatternsService = await dataViews.dataViewsServiceFactory(
        savedObjectsClient,
        esClient
      );

      try {
        const dataView = await indexPatternsService.get(dataViewId);
        const field = dataView.fields.find((f) => f.name === fieldName);

        if (!field) {
          throw new Error(`Field {fieldName} not found in data view ${dataView.title}`);
        }

        const searchHandler: SearchHandler = async (body) => {
          const result = await requestClient.search(
            buildSearchParams({
              dataViewPattern: dataView.title,
              timeFieldName: dataView.timeFieldName,
              fromDate,
              toDate,
              dslQuery,
              runtimeMappings: dataView.getRuntimeMappings(),
              ...body,
            })
          );
          return result;
        };

        const stats = await fetchAndCalculateFieldStats({
          searchHandler,
          dataView,
          field,
          fromDate,
          toDate,
          size,
        });

        return res.ok({
          body: stats,
        });
      } catch (e) {
        if (e instanceof SavedObjectNotFound) {
          return res.notFound();
        }
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          throw new Error(e.output.message);
        } else {
          throw e;
        }
      }
    }
  );
}
