/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Plugin, PluginInitializerContext } from '@kbn/core-plugins-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import { firstValueFrom, Subject } from 'rxjs';
import { LocalShipper } from './local_shipper';

export class EBTLocalShipperPlugin implements Plugin {
  private readonly esClient$ = new Subject<ElasticsearchClient>();

  constructor(private readonly pluginInitializerContext: PluginInitializerContext) {}

  public setup({ analytics, http }: CoreSetup) {
    const getElasticsearchClient = () => firstValueFrom(this.esClient$);

    // Using void because it won't reject
    void registerIndexMappings(
      getElasticsearchClient,
      this.pluginInitializerContext.logger.get('index-setup')
    );
    analytics.registerShipper(LocalShipper, { getElasticsearchClient });

    this.registerRoute(http);
  }

  public start() {}

  public stop() {}

  private registerRoute(http: CoreSetup['http']) {
    http
      .createRouter()
      .versioned.post({
        path: '/internal/example/ebt_local_shipper',
        access: 'internal',
      })
      .addVersion(
        {
          version: '1',
          validate: {
            request: {
              body: schema.object({
                events: schema.arrayOf(schema.any()),
              }),
            },
          },
        },
        async (context, request, response) => {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          this.esClient$.next(esClient); // Hack to obtain an ES client with permissions to write to data indices

          try {
            await esClient.bulk({
              index: 'ebt-kibana-browser',
              operations: request.body.events.flatMap((doc) => [{ create: {} }, doc]),
            });

            return response.ok();
          } catch (error) {
            return response.customError({ statusCode: 500, body: error });
          }
        }
      );
  }
}

async function registerIndexMappings(
  getElasticsearchClient: () => Promise<ElasticsearchClient>,
  logger: Logger
) {
  try {
    const esClient = await getElasticsearchClient();

    const indices = ['ebt-kibana-browser', 'ebt-kibana-server'];
    await Promise.all(
      indices.map(async (index) =>
        esClient.indices.create({
          index,
          mappings: {
            properties: {
              timestamp: { type: 'date' },
              event_type: { type: 'keyword' },
              // Using "flattened" for flexibility
              properties: { type: 'flattened' },
              context: {
                properties: {
                  // There are more, but just mapping a few.
                  // Anyone, feel free to keep extending this if needed.
                  cluster_uuid: { type: 'keyword' },
                  cluster_name: { type: 'keyword' },
                  version: { type: 'keyword' },
                  license_id: { type: 'keyword' },
                  userId: { type: 'keyword' },
                  cloudId: { type: 'keyword' },
                  isElasticCloudUser: { type: 'boolean' },
                  pageName: { type: 'keyword' },
                  applicationId: { type: 'keyword' },
                  entityId: { type: 'keyword' },
                },
              },
            },
          },
        })
      )
    );
  } catch (err) {
    logger.error(err);
  }
}
