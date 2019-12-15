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
import Joi from 'joi';
import moment from 'moment';
import { CoreSetup } from 'src/core/server';
import { telemetryCollectionManager, StatsGetterConfig } from '../collection_manager';

interface SendTelemetryOptInStatusConfig {
  optInStatusUrl: string;
  newOptInStatus: boolean;
}

export async function sendTelemetryOptInStatus(
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

export function registerTelemetryOptInStatsRoutes(core: CoreSetup) {
  const { server } = core.http as any;

  server.route({
    method: 'POST',
    path: '/api/telemetry/v2/clusters/_opt_in_stats',
    options: {
      validate: {
        payload: Joi.object({
          enabled: Joi.bool().required(),
          unencrypted: Joi.bool().default(true),
        }),
      },
    },
    handler: async (req: any, h: any) => {
      try {
        const newOptInStatus = req.payload.enabled;
        const unencrypted = req.payload.unencrypted;
        const statsGetterConfig = {
          start: moment()
            .subtract(20, 'minutes')
            .toISOString(),
          end: moment().toISOString(),
          server: req.server,
          req,
          unencrypted,
        };

        const optInStatus = await telemetryCollectionManager.getOptInStats(
          newOptInStatus,
          statsGetterConfig
        );

        return h.response(optInStatus).code(200);
      } catch (err) {
        return h.response([]).code(200);
      }
    },
  });
}
