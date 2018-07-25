/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from '@codesearch/esqueue';

import { REPOSITORY_CLONE_STATUS_INDEX_TYPE } from '../../mappings';
import { WorkerProgress } from '../../model/repository';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export class UpdateWorker extends AbstractWorker {
  public id: string = 'update';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    private readonly objectsClient: any
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;
    const repoService = new RepositoryService(dataPath, this.log);
    return await repoService.update(uri);
  }

  public async updateProgress(uri: string, progress: number) {
    const p: WorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
    };
    return await this.objectsClient.update(REPOSITORY_CLONE_STATUS_INDEX_TYPE, p.uri, p);
  }
}
