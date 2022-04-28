/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MetadataEvent, MetadataEventDoc } from '../../common';

interface Dependencies {
  logger: Logger;
}

const indexName = '.kibana-metadata-events-streams';

const getTimestamp = () => {
  return moment().toISOString();
};

export class MetadataEventsStreamsIndex {
  private esClient: ElasticsearchClient | undefined;
  private readonly logger: Logger;

  constructor({ logger }: Dependencies) {
    this.logger = logger;
  }

  init({ esClient }: { esClient: ElasticsearchClient }) {
    this.esClient = esClient;
    this.createIndexIfNotExist(indexName);
  }

  addEventToStream<E extends MetadataEvent>(streamName: string, event: E) {
    const document: MetadataEventDoc = {
      ...event,
      '@timestamp': getTimestamp(),
      stream: streamName,
    };

    if (!this.esClient) {
      throw new Error(
        `Missing ElasticsearchClient. Make sure that MetadataEventsStreamsIndex is initialized.`
      );
    }

    this.esClient.index({
      index: indexName,
      document,
    });
  }

  private async createIndexIfNotExist(
    index: string
  ): Promise<'created' | 'already_exists' | 'error'> {
    if (!this.esClient) {
      throw new Error(
        `Missing ElasticsearchClient. Make sure that MetadataEventsStreamsIndex is initialized.`
      );
    }

    try {
      return await this.esClient.indices
        .get({
          index,
        })
        .then(() => {
          return 'already_exists' as const;
        })
        .catch(async (e) => {
          if ((e.meta?.body?.status ?? e.meta?.statusCode) === 404) {
            await this.esClient!.indices.create({
              index,
              mappings: {
                dynamic: 'strict',
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                  type: {
                    type: 'keyword',
                  },
                  stream: {
                    type: 'keyword',
                  },
                  data: {
                    type: 'object',
                    dynamic: 'false',
                    properties: {
                      // Saved object id
                      so_id: {
                        type: 'keyword',
                      },
                    },
                  },
                },
              },
            });
            return 'created' as const;
          }
          throw e;
        });
    } catch (e) {
      this.logger.error(e);
      return 'error' as const;
    }
  }
}
