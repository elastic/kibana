/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@codesearch/esqueue';

import {
  REPOSITORY_CLONE_STATUS_INDEX_TYPE,
  REPOSITORY_DELETE_STATUS_INDEX_TYPE,
  REPOSITORY_INDEX_STATUS_INDEX_TYPE,
  REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE,
} from '../../mappings';
import { DeleteWorkerResult, WorkerProgress } from '../../model/repository';
import { documentIndexName, symbolIndexName } from '../indexer/schema';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    private readonly objectsClient: any,
    protected readonly client: EsClient
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;

    // TODO(mengwei): Optimize the async execution to maximize parallelizm.
    // 1. Delete repository on local fs.
    const repoService = new RepositoryService(dataPath, this.log);
    const deleteRes = await repoService.remove(uri);

    // 2. Delete repository data in ES.
    try {
      await this.objectsClient.delete(REPOSITORY_CLONE_STATUS_INDEX_TYPE, uri);
      await this.objectsClient.delete(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, uri);
      await this.objectsClient.delete(REPOSITORY_INDEX_STATUS_INDEX_TYPE, uri);

      await this.client.indices.delete({
        index: symbolIndexName(uri),
      });
      await this.client.indices.delete({
        index: documentIndexName(uri),
      });
    } catch (error) {
      this.log.error(`Delete repository status error: ${error}`);
    }

    return deleteRes;
  }

  public async onJobEnqueued(job: Job) {
    const progress: WorkerProgress = {
      uri: job.payload.uri,
      progress: 0,
      timestamp: new Date(),
    };
    return await this.objectsClient.create(REPOSITORY_DELETE_STATUS_INDEX_TYPE, progress, {
      id: progress.uri,
    });
  }

  public async onJobCompleted(res: DeleteWorkerResult) {
    return await this.objectsClient.delete(REPOSITORY_DELETE_STATUS_INDEX_TYPE, res.uri);
  }

  public async updateProgress(uri: string, progress: number) {
    const p: WorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
    };
    return await this.objectsClient.update(REPOSITORY_DELETE_STATUS_INDEX_TYPE, p.uri, p);
  }
}
