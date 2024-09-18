/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';

import type { IRouter } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type {
  TelemetryCollectionManagerPluginSetup,
  StatsGetterConfig,
} from '@kbn/telemetry-collection-manager-plugin/server';
import { GetOptInStatsRoutePathBasedV2 } from '../../common/routes';
import type { v2 } from '../../common/types';
import { EncryptedTelemetryPayload, UnencryptedTelemetryPayload } from '../../common/types';
import { getTelemetryChannelEndpoint } from '../../common/telemetry_config';
import { PAYLOAD_CONTENT_ENCODING } from '../../common/constants';

interface SendTelemetryOptInStatusConfig {
  appendServerlessChannelsSuffix: boolean;
  sendUsageTo: 'staging' | 'prod';
  newOptInStatus: boolean;
  currentKibanaVersion: string;
}

export async function sendTelemetryOptInStatus(
  telemetryCollectionManager: Pick<TelemetryCollectionManagerPluginSetup, 'getOptInStats'>,
  config: SendTelemetryOptInStatusConfig,
  statsGetterConfig: StatsGetterConfig
): Promise<void> {
  const { appendServerlessChannelsSuffix, sendUsageTo, newOptInStatus, currentKibanaVersion } =
    config;
  const optInStatusUrl = getTelemetryChannelEndpoint({
    appendServerlessChannelsSuffix,
    env: sendUsageTo,
    channelName: 'optInStatus',
  });

  const optInStatusPayload: UnencryptedTelemetryPayload | EncryptedTelemetryPayload =
    await telemetryCollectionManager.getOptInStats(newOptInStatus, statsGetterConfig);

  await Promise.all(
    optInStatusPayload.map(async ({ clusterUuid, stats }) => {
      return await fetch(optInStatusUrl, {
        method: 'post',
        body: typeof stats === 'string' ? stats : JSON.stringify(stats),
        headers: {
          'Content-Type': 'application/json',
          'X-Elastic-Stack-Version': currentKibanaVersion,
          'X-Elastic-Cluster-ID': clusterUuid,
          'X-Elastic-Content-Encoding': PAYLOAD_CONTENT_ENCODING,
        },
      });
    })
  );
}

export function registerTelemetryOptInStatsRoutes(
  router: IRouter,
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup
) {
  router.versioned
    .post({
      access: 'public', // It's not used across Kibana, and I didn't want to remove it in this PR just in case.
      path: GetOptInStatsRoutePathBasedV2,
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              enabled: schema.boolean(),
              unencrypted: schema.boolean({ defaultValue: true }),
            }),
          },
          response: {
            200: {
              body: () =>
                schema.arrayOf(
                  schema.object({
                    clusterUuid: schema.string(),
                    stats: schema.object({
                      cluster_uuid: schema.string(),
                      opt_in_status: schema.boolean(),
                    }),
                  })
                ),
            },
            503: { body: () => schema.string() },
          },
        },
      },
      async (context, req, res) => {
        try {
          const newOptInStatus = req.body.enabled;
          const unencrypted = req.body.unencrypted;

          if (!(await telemetryCollectionManager.shouldGetTelemetry())) {
            // We probably won't reach here because there is a license check in the auth phase of the HTTP requests.
            // But let's keep it here should that changes at any point.
            return res.customError({
              statusCode: 503,
              body: `Can't fetch telemetry at the moment because some services are down. Check the /status page for more details.`,
            });
          }

          const statsGetterConfig: StatsGetterConfig = {
            unencrypted,
          };

          const optInStatus = await telemetryCollectionManager.getOptInStats(
            newOptInStatus,
            statsGetterConfig
          );
          const body: v2.OptInStatsResponse = optInStatus;
          return res.ok({ body });
        } catch (err) {
          return res.ok({ body: [] });
        }
      }
    );
}
