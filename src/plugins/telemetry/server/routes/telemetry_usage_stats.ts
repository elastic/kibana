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

import moment from 'moment';
import { schema } from '@kbn/config-schema';
import { TypeOptions } from '@kbn/config-schema/target/types/types';
import { IRouter } from 'kibana/server';
import {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from 'src/plugins/telemetry_collection_manager/server';

const validate: TypeOptions<string | number>['validate'] = (value) => {
  if (!moment(value).isValid()) {
    return `${value} is not a valid date`;
  }
};

const dateSchema = schema.oneOf([schema.string({ validate }), schema.number({ validate })]);

export function registerTelemetryUsageStatsRoutes(
  router: IRouter,
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup,
  isDev: boolean
) {
  router.post(
    {
      path: '/api/telemetry/v2/clusters/_stats',
      validate: {
        body: schema.object({
          unencrypted: schema.boolean({ defaultValue: false }),
          timeRange: schema.object({
            min: dateSchema,
            max: dateSchema,
          }),
        }),
      },
    },
    async (context, req, res) => {
      const start = moment(req.body.timeRange.min).toISOString();
      const end = moment(req.body.timeRange.max).toISOString();
      const unencrypted = req.body.unencrypted;

      try {
        const statsConfig: StatsGetterConfig = {
          unencrypted,
          start,
          end,
          request: req,
        };
        const stats = await telemetryCollectionManager.getStats(statsConfig);
        return res.ok({ body: stats });
      } catch (err) {
        if (isDev) {
          // don't ignore errors when running in dev mode
          throw err;
        }
        if (unencrypted && err.status === 403) {
          return res.forbidden();
        }
        // ignore errors and return empty set
        return res.ok({ body: [] });
      }
    }
  );
}
