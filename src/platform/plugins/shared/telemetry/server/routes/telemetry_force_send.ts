/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { IRouter } from '@kbn/core/server';
import type {
  TelemetryCollectionManagerPluginSetup,
  UsageStatsPayload,
} from '@kbn/telemetry-collection-manager-plugin/server';
import { firstValueFrom, type Observable } from 'rxjs';
import { schema } from '@kbn/config-schema';
import fetch from 'node-fetch';
import { PAYLOAD_CONTENT_ENCODING } from '../../common/constants';
import type { TelemetryConfigType } from '../config';
import { getTelemetryChannelEndpoint } from '../../common/telemetry_config';

export interface RegisterTelemetryForceSendParams {
  logger: Logger;
  config$: Observable<TelemetryConfigType>;
  currentKibanaVersion: string;
  router: IRouter;
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup;
}

export function registerTelemetryForceSend({
  config$,
  currentKibanaVersion,
  router,
  telemetryCollectionManager,
}: RegisterTelemetryForceSendParams) {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/telemetry/force_send',
      security: {
        authz: {
          enabled: false,
          reason:
            'Only registered in dev mode: this is a helper for developers to force send telemetry',
        },
      },
      enableQueryVersion: true, // Allow specifying the version through querystring so that we can use it in Dev Console
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              // If provided, the telemetry will be sent to this local index instead of the default one
              localIndex: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, req, res) => {
        // If a local index is provided, we will use it to write the telemetry data to that index
        const localIndex = req.body?.localIndex;
        if (localIndex) {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // if it doesn't exist, create the index with very basic mappings
          if (!(await esClient.indices.exists({ index: localIndex }))) {
            await esClient.indices.create({
              index: localIndex,
              mappings: {
                dynamic: false, // Disable dynamic mapping
                properties: {
                  timestamp: { type: 'date' },
                  'cluster-uuid': { type: 'keyword' },
                },
              },
            });
          }

          const clusters: Array<{ clusterUuid: string; stats: UsageStatsPayload }> =
            await telemetryCollectionManager.getStats({
              unencrypted: true,
              refreshCache: true,
            });
          await esClient.bulk({
            index: localIndex,
            operations: clusters.flatMap(({ clusterUuid, stats }) => [
              { create: {} },
              {
                timestamp: new Date().toISOString(),
                'cluster-uuid': clusterUuid,
                'original-body': stats,
              },
            ]),
          });
          return res.ok({
            body: `Telemetry documents indexed in the local index ${localIndex}. GET /${localIndex}/_search to see your documents.`,
          });
        } else {
          // TODO: Selective copy-paste from the fetcher.ts file. We should refactor this and use the common EBT Shipper to maintain only one client.
          const payload: Array<{ clusterUuid: string; stats: string }> =
            await telemetryCollectionManager.getStats({
              unencrypted: false,
              refreshCache: true,
            });
          const config = await firstValueFrom(config$);
          const telemetryUrl = getTelemetryChannelEndpoint({
            appendServerlessChannelsSuffix: config.appendServerlessChannelsSuffix,
            channelName: 'snapshot',
            env: config.sendUsageTo,
          });
          await Promise.all(
            payload.map(async ({ clusterUuid, stats }) => {
              await fetch(telemetryUrl, {
                method: 'post',
                body: stats,
                headers: {
                  'Content-Type': 'application/json',
                  'X-Elastic-Stack-Version': currentKibanaVersion,
                  'X-Elastic-Cluster-ID': clusterUuid,
                  'X-Elastic-Content-Encoding': PAYLOAD_CONTENT_ENCODING,
                },
              });
            })
          );
          return res.ok({
            body: `Telemetry shipped to ${telemetryUrl}. Check the results in the receiving system.`,
          });
        }
      }
    );
}
