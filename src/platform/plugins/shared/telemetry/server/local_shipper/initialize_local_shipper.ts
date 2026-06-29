/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, firstValueFrom } from 'rxjs';

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { TELEMETRY_LOCAL_EBT_INDICES } from '../../common/local_shipper';
import { LocalEBTShipper } from './local_ebt_shipper';
import { registerIndexMappings } from './register_mappings';

const esClient$ = new Subject<ElasticsearchClient>();

export function initializeLocalShipper(logger: Logger, { analytics, http }: CoreSetup) {
  const getElasticsearchClient = () => firstValueFrom(esClient$);
  const elasticsearchClientWithDelay = getElasticsearchClient().then(async (esClient) => {
    // Wait 5s after the ES client has been resolved to give time for the indices to be created
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return esClient;
  });
  const getElasticsearchClientWithDelay = () => elasticsearchClientWithDelay;

  // Using void because it won't reject
  void registerIndexMappings(getElasticsearchClient, logger.get('index-setup'));
  analytics.registerShipper(LocalEBTShipper, {
    getElasticsearchClient: getElasticsearchClientWithDelay,
  });

  registerRoute(http, getElasticsearchClientWithDelay, logger.get('ebt-route'));
}

function registerRoute(
  http: CoreSetup['http'],
  getElasticsearchClient: () => Promise<ElasticsearchClient>,
  logger: Logger
) {
  http
    .createRouter()
    .versioned.post({
      path: '/internal/telemetry/ebt_local_shipper',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Elasticsearch client',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              events: schema.arrayOf(schema.any(), { maxSize: 10_000 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        esClient$.next((await context.core).elasticsearch.client.asCurrentUser); // Hack to obtain an ES client with permissions to write to data indices

        const esClient = await getElasticsearchClient();

        try {
          const result = await esClient.bulk({
            index: TELEMETRY_LOCAL_EBT_INDICES.BROWSER,
            operations: request.body.events.flatMap((doc) => [{ create: {} }, doc]),
          });

          // A bulk request returns HTTP 200 with `errors: true` when individual
          // documents are rejected (e.g. a mapping mismatch) while the request
          // itself is well-formed. Without this check those events would be
          // silently dropped. Log the per-item reasons so the cause is visible.
          if (result.errors) {
            const reasons = result.items
              .map((item) => item.create?.error ?? item.index?.error)
              .filter(Boolean);
            logger.error(
              `Local EBT shipper failed to index ${reasons.length} event(s): ${JSON.stringify(
                reasons
              )}`
            );
          }

          return response.ok();
        } catch (error) {
          logger.error(error);
          return response.customError({ statusCode: 500, body: error });
        }
      }
    );
}
