/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from 'src/plugins/telemetry_collection_manager/server';
import { getTelemetryChannelEndpoint } from '../../common/telemetry_config';

interface SendTelemetryOptInStatusConfig {
  sendUsageTo: 'staging' | 'prod';
  newOptInStatus: boolean;
  currentKibanaVersion: string;
}

export async function sendTelemetryOptInStatus(
  telemetryCollectionManager: Pick<TelemetryCollectionManagerPluginSetup, 'getOptInStats'>,
  config: SendTelemetryOptInStatusConfig,
  statsGetterConfig: StatsGetterConfig
) {
  const { sendUsageTo, newOptInStatus, currentKibanaVersion } = config;
  const optInStatusUrl = getTelemetryChannelEndpoint({
    env: sendUsageTo,
    channelName: 'optInStatus',
  });

  const optInStatus = await telemetryCollectionManager.getOptInStats(
    newOptInStatus,
    statsGetterConfig
  );

  await fetch(optInStatusUrl, {
    method: 'post',
    body: JSON.stringify(optInStatus),
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
