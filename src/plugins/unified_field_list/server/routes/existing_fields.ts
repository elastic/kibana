/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Logger } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { fetchFieldExistence, isBoomError } from '../../common/utils/field_existing_utils';
import { FIELD_EXISTING_API_PATH } from '../../common/constants';
import { FIELD_EXISTENCE_SETTING } from '../../common';
import { PluginStart } from '../types';

export async function existingFieldsRoute(setup: CoreSetup<PluginStart>, logger: Logger) {
  const router = setup.http.createRouter();

  router.post(
    {
      path: FIELD_EXISTING_API_PATH,
      validate: {
        params: schema.object({
          dataViewId: schema.string(),
        }),
        body: schema.object({
          dslQuery: schema.object({}, { unknowns: 'allow' }),
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeFieldName: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const [{ savedObjects, elasticsearch, uiSettings }, { dataViews }] =
        await setup.getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(req);
      const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
      const [includeFrozen, useSampling, metaFields] = await Promise.all([
        uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN),
        uiSettingsClient.get(FIELD_EXISTENCE_SETTING),
        uiSettingsClient.get(UI_SETTINGS.META_FIELDS),
      ]);
      const esClient = elasticsearch.client.asScoped(req).asCurrentUser;
      try {
        const dataViewsService = await dataViews.dataViewsServiceFactory(
          savedObjectsClient,
          esClient
        );
        return res.ok({
          body: await fetchFieldExistence({
            ...req.body,
            dataViewsService,
            includeFrozen,
            useSampling,
            metaFields,
            dataView: await dataViewsService.get(req.params.dataViewId),
            search: async (params) => {
              const contextCore = await context.core;
              return await contextCore.elasticsearch.client.asCurrentUser.search<
                estypes.SearchHit[]
              >(
                { ...params },
                {
                  // Global request timeout. Will cancel the request if exceeded. Overrides the elasticsearch.requestTimeout
                  requestTimeout: '5000ms',
                  // Fails fast instead of retrying- default is to retry
                  maxRetries: 0,
                }
              );
            },
          }),
        });
      } catch (e) {
        if (e instanceof errors.TimeoutError) {
          logger.info(`Field existence check timed out on ${req.params.dataViewId}`);
          // 408 is Request Timeout
          return res.customError({ statusCode: 408, body: e.message });
        }
        logger.info(
          `Field existence check failed on ${req.params.dataViewId}: ${
            isBoomError(e) ? e.output.payload.message : e.message
          }`
        );
        if (e instanceof errors.ResponseError && e.statusCode === 404) {
          return res.notFound({ body: e.message });
        }
        if (isBoomError(e)) {
          if (e.output.statusCode === 404) {
            return res.notFound({ body: e.output.payload.message });
          }
          throw new Error(e.output.payload.message);
        } else {
          throw e;
        }
      }
    }
  );
}
