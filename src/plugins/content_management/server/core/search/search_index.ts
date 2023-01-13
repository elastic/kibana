/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Content } from '../../../common';

interface Dependencies {
  logger: Logger;
}

const indexName = '.kibana-content-mgt';

export class ContentSearchIndex {
  private esClient: ElasticsearchClient | undefined;
  private readonly logger: Logger;

  constructor({ logger }: Dependencies) {
    this.logger = logger;
  }

  start({ esClient }: { esClient: ElasticsearchClient }) {
    this.esClient = esClient;
    this.createIndexIfNotExist(indexName);
  }

  index(content: Content) {
    const { id, title, description, type, meta } = content;

    const document = {
      title,
      description,
      type,
      meta,
    };

    return this.getEsClient()
      .index({
        index: indexName,
        id: `${type}#${id}`,
        document,
      })
      .catch((e) => {
        // console.log(e); // Temp for debugging
        this.logger.error(new Error(`Could not add content to search index.`, { cause: e }));
      });
  }

  getById(type: string, id: string) {
    return this.getEsClient().search({
      query: {
        ids: {
          values: [`${type}#${id}`],
        },
      },
      index: indexName,
    });
  }

  search(searchRequest: estypes.SearchRequest) {
    return this.getEsClient().search({
      ...searchRequest,
      index: indexName,
    });
  }

  private async createIndexIfNotExist(
    index: string
  ): Promise<'created' | 'already_exists' | 'error'> {
    try {
      return await this.getEsClient()
        .indices.get({
          index,
        })
        .then(() => {
          this.logger.info(`Content search index already exists.`);
          return 'already_exists' as const;
        })
        .catch(async (e) => {
          if ((e.meta?.body?.status ?? e.meta?.statusCode) === 404) {
            this.logger.info(`Creating content search index [${index}]...`);

            await this.esClient!.indices.create({
              index,
              mappings: {
                dynamic: 'strict',
                properties: {
                  title: { type: 'text' },
                  description: { type: 'text' },
                  type: { type: 'keyword' },
                  meta: {
                    type: 'object',
                    dynamic: 'false',
                    properties: {
                      updatedAt: {
                        type: 'date',
                      },
                      updatedBy: {
                        type: 'object',
                        dynamic: 'false',
                        properties: {
                          $id: {
                            type: 'keyword',
                          },
                        },
                      },
                      createdAt: {
                        type: 'date',
                      },
                      createdBy: {
                        type: 'object',
                        dynamic: 'false',
                        properties: {
                          $id: {
                            type: 'keyword',
                          },
                        },
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

  private getEsClient() {
    if (!this.esClient) {
      throw new Error(
        `Missing ElasticsearchClient. Make sure that ContentSearchIndex is initialized.`
      );
    }
    return this.esClient;
  }
}
