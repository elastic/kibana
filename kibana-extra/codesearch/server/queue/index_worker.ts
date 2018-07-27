/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from '@codesearch/esqueue';

import {
  REPOSITORY_INDEX_STATUS_INDEX_TYPE,
  REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE,
} from '../../mappings';
import { IndexWorkerResult, WorkerProgress } from '../../model/repository';
import { Indexer, IndexProgress } from '../indexer';
import { Log } from '../log';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export class IndexWorker extends AbstractWorker {
  public id: string = 'index';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly objectsClient: any,
    protected readonly indexers: Indexer[]
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { uri } = job.payload;

    const progressReporter = async (progress: IndexProgress) => {
      let statusIndex;
      if (progress.type === 'lsp') {
        statusIndex = REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE;
      } else if (progress.type === 'repository') {
        statusIndex = REPOSITORY_INDEX_STATUS_INDEX_TYPE;
      }

      const p: WorkerProgress = {
        uri,
        progress: progress.percentage,
        timestamp: new Date(),
      };
      try {
        return await this.objectsClient.create(statusIndex, p, {
          id: uri,
        });
      } catch (error) {
        // If the object already exists then update the status
        return await this.objectsClient.update(statusIndex, uri, p);
      }
    };

    for (const indexer of this.indexers) {
      // TODO: add revision and make indexers run in parallel.
      await indexer.start(uri, progressReporter);
    }

    // TODO: populate the actual index result
    const res: IndexWorkerResult = {
      uri,
      revision: 'HEAD',
      // Number of symbols indexed.
      symbols: 0,
      // Number of files indexed.
      file: 0,
    };
    return res;
  }

  public async onJobEnqueued(job: Job) {
    const { uri } = job.payload;
    const progress: WorkerProgress = {
      uri,
      progress: 0,
      timestamp: new Date(),
    };
    try {
      await this.objectsClient.create(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, progress, {
        id: uri,
      });
    } catch (error) {
      // If the object already exists then update the status
      return await this.objectsClient.update(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, uri, progress);
    }
    try {
      await this.objectsClient.create(REPOSITORY_INDEX_STATUS_INDEX_TYPE, progress, {
        id: uri,
      });
    } catch (error) {
      // If the object already exists then update the status
      return await this.objectsClient.update(REPOSITORY_INDEX_STATUS_INDEX_TYPE, uri, progress);
    }
  }
}
