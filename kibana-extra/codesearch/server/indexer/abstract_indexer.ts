/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexRequest, RepositoryUri } from '../../model';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { Indexer, IndexProgress, ProgressReporter } from './index';

export abstract class AbstractIndexer implements Indexer {
  protected type: string = 'abstract';

  constructor(protected readonly serverOption: ServerOptions, protected readonly log: Log) {}

  public async start(repoUri: RepositoryUri, progressReporter?: ProgressReporter) {
    this.log.info(`Indexer ${this.type} started for repo ${repoUri}`);
    const files = await this.prepareRequests(repoUri);
    const totalCount = files.length;
    let prevPercentage = 0;
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        await this.processRequest(file);
        successCount += 1;
      } catch (error) {
        failCount += 1;
      }

      if (progressReporter) {
        this.log.info(`Update progres for ${this.type} indexer.`);
        // Update progress if progress reporter has been provided.
        const progress: IndexProgress = {
          type: this.type,
          total: totalCount,
          success: successCount,
          fail: failCount,
          percentage: Math.floor(100 * (successCount + failCount) / totalCount),
        };
        if (progress.percentage > prevPercentage + 5) {
          progressReporter(progress);
          prevPercentage = progress.percentage;
        }
      }
    }
  }

  public async prepareRequests(repoUri: RepositoryUri): Promise<IndexRequest[]> {
    // This is the abstract implementation. You should override this.
    return new Promise<IndexRequest[]>((resolve, reject) => {
      resolve();
    });
  }

  public async processRequest(request: IndexRequest) {
    // This is the abstract implementation. You should override this.
    return;
  }
}
