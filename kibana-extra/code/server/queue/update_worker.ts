/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@code/esqueue';

import { CloneWorkerResult } from '../../model';
import { SavedObjectsClient } from '../kibana_types';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractGitWorker } from './abstract_git_worker';
import { Job } from './job';

export class UpdateWorker extends AbstractGitWorker {
  public id: string = 'update';

  constructor(
    queue: Esqueue,
    protected readonly log: Log,
    objectsClient: SavedObjectsClient,
    client: EsClient
  ) {
    super(queue, log, objectsClient, client);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;
    this.log.info(`Execute update job for ${uri}`);
    const repoService = new RepositoryService(dataPath, this.log);
    return await repoService.update(uri);
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    this.log.info(`Update job done for ${job.payload.uri}`);
    return await super.onJobCompleted(job, res);
  }
}
