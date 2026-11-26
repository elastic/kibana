/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { CoreSetup, CoreStart, ElasticsearchClient, Logger } from '@kbn/core/server';
import { isRetryableEsClientError } from '@kbn/core-elasticsearch-server-utils';
import { createOrUpdateIndex } from './helpers';
import { PlainIndexDataClient } from './plain_index_data_client';
import { createRetryingEsClient } from '../../../../lib/create_retrying_es_client';
import type { DataClient, EntityDataClient } from '../../types';

export interface PlainIndexEntityDataClientDeps<TDoc extends { id: string }> {
  logger: Logger;
  indexName: string;
  mappings: MappingTypeMapping;
}

/** One plain-index execution entity. Index creation runs at start; setup has nothing to register. */
export class PlainIndexEntityDataClient<TDoc extends { id: string }>
  implements EntityDataClient<DataClient<TDoc>>
{
  private esClient: ElasticsearchClient | undefined;
  private stopped = false;

  constructor(private readonly deps: PlainIndexEntityDataClientDeps<TDoc>) {}

  initSetup(_coreSetup: CoreSetup): Promise<void> {
    return Promise.resolve();
  }

  async initStart(coreStart: CoreStart): Promise<void> {
    const esClient = createRetryingEsClient(
      coreStart.elasticsearch.client.asInternalUser,
      this.deps.logger
    );
    this.esClient = await this.init(esClient, this.deps.logger);
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  createClient(): DataClient<TDoc> {
    if (!this.esClient) {
      throw new Error(
        'PlainIndexEntityDataClient.initStart() must complete before creating clients'
      );
    }

    return new PlainIndexDataClient<TDoc>({
      esClient: this.esClient,
      logger: this.deps.logger,
      indexName: this.deps.indexName,
    });
  }

  private async init(esClient: ElasticsearchClient, logger: Logger): Promise<ElasticsearchClient> {
    let attempt = 0;

    while (!this.stopped) {
      try {
        await createOrUpdateIndex({
          esClient,
          indexName: this.deps.indexName,
          mappings: this.deps.mappings,
          logger,
        });
        return esClient;
      } catch (error) {
        if (!isRetryableEsClientError(error)) {
          throw error;
        }
        attempt++;
        const ms = Math.min(1000 * Math.pow(2, attempt), 30_000);
        logger.warn(`Transient error during index init, retrying in ${ms}ms`, { error });
        await new Promise((resolve) => setTimeout(resolve, ms));
      }
    }
    throw new Error('Index initialization aborted: plugin stopped');
  }
}
