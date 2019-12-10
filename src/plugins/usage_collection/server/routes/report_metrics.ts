/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { schema } from '@kbn/config-schema';
import { METRIC_TYPE, Report } from '@kbn/analytics';
import { IRouter } from '../../../../../src/core/server';
import { storeReport } from '../store_report';

export function registerUiMetricRoute(router: IRouter, getLegacySavedObjects: () => any) {
  router.post(
    {
      path: '/api/ui_metric/report',
      validate: {
        body: schema.object({
          report: schema.object({
            reportVersion: schema.maybe(schema.literal(1)),
            userAgent: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  key: schema.string(),
                  type: schema.string(),
                  appName: schema.string(),
                  userAgent: schema.string(),
                })
              )
            ),
            uiStatsMetrics: schema.maybe(
              schema.recordOf(
                schema.string(),
                schema.object({
                  key: schema.string(),
                  type: schema.oneOf([
                    schema.literal<METRIC_TYPE>(METRIC_TYPE.CLICK),
                    schema.literal<METRIC_TYPE>(METRIC_TYPE.LOADED),
                    schema.literal<METRIC_TYPE>(METRIC_TYPE.COUNT),
                  ]),
                  appName: schema.string(),
                  eventName: schema.string(),
                  stats: schema.object({
                    min: schema.number(),
                    sum: schema.number(),
                    max: schema.number(),
                    avg: schema.number(),
                  }),
                })
              )
            ),
          }),
        }),
      },
    },
    async (context, req, res) => {
      const { report } = req.body;
      try {
        const internalRepository = getLegacySavedObjects();
        await storeReport(internalRepository, report as Report);
        return res.ok({ body: { status: 'ok' } });
      } catch (error) {
        return res.ok({ body: { status: 'fail' } });
      }
    }
  );
}
