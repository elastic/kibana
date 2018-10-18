/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';

import { Indexer, IndexProgress, ProgressReporter } from '.';
import { IndexRequest, RepositoryUri } from '../../model';
import { Log } from '../log';
import { IndexCreationRequest } from './index_creation_request';

export abstract class AbstractIndexer implements Indexer {
  protected type: string = 'abstract';

  constructor(protected readonly client: EsClient, protected readonly log: Log) {}

  public async start(
    repoUri: RepositoryUri,
    revision: string,
    progressReporter?: ProgressReporter
  ) {
    this.log.info(`Indexer ${this.type} started for repo ${repoUri} with revision ${revision}`);

    // Prepare the ES index
    const res = await this.prepareIndex(repoUri);
    if (!res) {
      this.log.error(`Prepare index for ${repoUri} error. Skip indexing.`);
      return;
    }

    // Clean up the index if necessary
    await this.cleanIndex(repoUri);

    // Prepare all the index requests
    let reqs;
    let totalCount = 0;
    let prevPercentage = 0;
    let successCount = 0;
    let failCount = 0;

    try {
      reqs = await this.prepareRequests(repoUri);
      totalCount = reqs.length;
    } catch (error) {
      this.log.error(`Prepare requests for ${repoUri} error.`);
      throw error;
    }

    for (const req of reqs) {
      try {
        await this.processRequest(req);
        successCount += 1;
      } catch (error) {
        failCount += 1;
      }

      if (progressReporter) {
        this.log.debug(`Update progress for ${this.type} indexer.`);
        // Update progress if progress reporter has been provided.
        const progress: IndexProgress = {
          type: this.type,
          total: totalCount,
          success: successCount,
          fail: failCount,
          percentage: Math.floor((100 * (successCount + failCount)) / totalCount),
        };
        if (progress.percentage > prevPercentage + 5) {
          progressReporter(progress);
          prevPercentage = progress.percentage;
        }
      }
    }
  }

  protected async cleanIndex(repoUri: RepositoryUri): Promise<void> {
    // This is the abstract implementation. You should override this.
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  protected async prepareRequests(repoUri: RepositoryUri): Promise<IndexRequest[]> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexRequest[]>((resolve, reject) => {
      resolve();
    });
  }

  protected async processRequest(request: IndexRequest) {
    // This is the abstract implementation. You should override this.
    return;
  }

  protected async prepareIndexCreationRequests(
    repoUri: RepositoryUri
  ): Promise<IndexCreationRequest[]> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexCreationRequest[]>((resolve, reject) => {
      resolve();
    });
  }

  protected async prepareIndex(repoUri: RepositoryUri) {
    const creationReqs = await this.prepareIndexCreationRequests(repoUri);
    for (const req of creationReqs) {
      try {
        const res = await this.createIndex(req);
        if (!res) {
          this.log.info(`Index creation failed for ${req.index}.`);
          return false;
        }
      } catch (error) {
        this.log.error(`Index creation error: ${error}`);
        return false;
      }
    }
    return true;
  }

  private async createIndex(creationReq: IndexCreationRequest): Promise<boolean> {
    const body = {
      settings: creationReq.settings,
      mappings: {
        [creationReq.type]: {
          dynamic_templates: [
            {
              fieldDefaultNotAnalyzed: {
                match: '*',
                mapping: {
                  index: false,
                  norms: false,
                },
              },
            },
          ],
          properties: creationReq.schema,
        },
      },
    };
    const exists = await this.client.indices.exists({
      index: creationReq.index,
    });
    if (!exists) {
      await this.client.indices.create({
        index: creationReq.index,
        body,
      });
      return true;
    }
    return exists;
  }
}
