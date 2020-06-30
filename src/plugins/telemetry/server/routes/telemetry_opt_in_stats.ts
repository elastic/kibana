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

// @ts-ignore
import fetch from 'node-fetch';
import moment from 'moment';

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from 'src/plugins/telemetry_collection_manager/server';

interface SendTelemetryOptInStatusConfig {
  optInStatusUrl: string;
  newOptInStatus: boolean;
}

export async function sendTelemetryOptInStatus(
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup,
  config: SendTelemetryOptInStatusConfig,
  statsGetterConfig: StatsGetterConfig
) {
  const { optInStatusUrl, newOptInStatus } = config;
  const optInStatus = await telemetryCollectionManager.getOptInStats(
    newOptInStatus,
    statsGetterConfig
  );

  await fetch(optInStatusUrl, {
    method: 'post',
    body: optInStatus,
  });
}

export function registerTelemetryOptInStatsRoutes(
  router: IRouter,
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup
) {
  router.post(
    {
      path: '/api/telemetry/v2/clusters/_opt_in_stats',
      validate: {
        body: schema.object({
          enabled: schema.boolean(),
          unencrypted: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    async (context, req, res) => {
      try {
        const newOptInStatus = req.body.enabled;
        const unencrypted = req.body.unencrypted;

        const statsGetterConfig: StatsGetterConfig = {
          start: moment().subtract(20, 'minutes').toISOString(),
          end: moment().toISOString(),
          unencrypted,
          request: req,
        };

        const optInStatus = await telemetryCollectionManager.getOptInStats(
          newOptInStatus,
          statsGetterConfig
        );
        return res.ok({ body: optInStatus });
      } catch (err) {
        return res.ok({ body: [] });
      }
    }
  );
}
