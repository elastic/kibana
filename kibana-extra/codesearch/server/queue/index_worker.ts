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
import { IndexerFactory, IndexProgress } from '../indexer';
import { SavedObjectsClient } from '../kibana_types';
import { Log } from '../log';
import { AbstractWorker } from './abstract_worker';
import { CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class IndexWorker extends AbstractWorker {
  public id: string = 'index';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly objectsClient: SavedObjectsClient,
    protected readonly indexerFactories: IndexerFactory[],
    private readonly cancellationService: CancellationSerivce
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { payload, cancellationToken } = job;
    const { uri, revision } = payload;

    const progressReporter = async (progress: IndexProgress) => {
      let statusIndex = '';
      if (progress.type === 'lsp') {
        statusIndex = REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE;
      } else if (progress.type === 'repository') {
        statusIndex = REPOSITORY_INDEX_STATUS_INDEX_TYPE;
      }

      const p: WorkerProgress = {
        uri,
        progress: progress.percentage,
        timestamp: new Date(),
        revision,
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

    for (const indexerFactory of this.indexerFactories) {
      this.cancellationService.cancelIndexJob(uri);
      // TODO: make indexers run in parallel.
      const indexer = indexerFactory.create(uri, revision);
      indexer.start(progressReporter);
      if (cancellationToken) {
        cancellationToken.on(() => {
          indexer.cancel();
        });
        this.cancellationService.registerIndexJobToken(uri, cancellationToken);
      }
    }

    // TODO: populate the actual index result
    const res: IndexWorkerResult = {
      uri,
      revision,
      // Number of symbols indexed.
      symbols: 0,
      // Number of files indexed.
      file: 0,
    };
    return res;
  }

  public async onJobEnqueued(job: Job) {
    const { uri, revision } = job.payload;
    const progress: WorkerProgress = {
      uri,
      progress: 0,
      timestamp: new Date(),
      revision,
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

  public async onJobCompleted(job: Job, res: WorkerProgress) {
    const { uri } = job.payload;
    await this.objectsClient.update(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, uri, {
      progress: 100,
      timestamp: new Date(),
    });

    await this.objectsClient.update(REPOSITORY_INDEX_STATUS_INDEX_TYPE, uri, {
      progress: 100,
      timestamp: new Date(),
    });

    return await super.onJobCompleted(job, res);
  }
}
