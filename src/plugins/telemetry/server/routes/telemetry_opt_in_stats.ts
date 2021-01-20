/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-ignore
import fetch from 'node-fetch';

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from 'src/plugins/telemetry_collection_manager/server';

interface SendTelemetryOptInStatusConfig {
  optInStatusUrl: string;
  newOptInStatus: boolean;
  currentKibanaVersion: string;
}

export async function sendTelemetryOptInStatus(
  telemetryCollectionManager: Pick<TelemetryCollectionManagerPluginSetup, 'getOptInStats'>,
  config: SendTelemetryOptInStatusConfig,
  statsGetterConfig: StatsGetterConfig
) {
  const { optInStatusUrl, newOptInStatus, currentKibanaVersion } = config;
  const optInStatus = await telemetryCollectionManager.getOptInStats(
    newOptInStatus,
    statsGetterConfig
  );

  await fetch(optInStatusUrl, {
    method: 'post',
    body: optInStatus,
    headers: { 'X-Elastic-Stack-Version': currentKibanaVersion },
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
