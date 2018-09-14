/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@codesearch/esqueue';

import { RepositoryUtils } from '../../common/repository_utils';
import { REPOSITORY_CLONE_STATUS_INDEX_TYPE } from '../../mappings';
import { CloneProgress, CloneWorkerProgress } from '../../model';
import {
  RepositoryIndexName,
  RepositoryReserviedField,
  RepositoryTypeName,
} from '../indexer/schema';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractGitWorker } from './abstract_git_worker';
import { Job } from './job';

export class CloneWorker extends AbstractGitWorker {
  public id: string = 'clone';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly objectsClient: any,
    protected readonly client: EsClient
  ) {
    super(queue, log, objectsClient, client);
  }

  public async executeJob(job: Job) {
    const { url, dataPath } = job.payload;
    const repoService = new RepositoryService(dataPath, this.log);
    const repo = RepositoryUtils.buildRepository(url);
    return await repoService.clone(repo, (progress: number, cloneProgress?: CloneProgress) => {
      this.updateProgress(repo.uri, progress, cloneProgress);
    });
  }

  public async onJobEnqueued(job: Job) {
    const { url } = job.payload;
    const repo = RepositoryUtils.buildRepository(url);
    const progress: CloneWorkerProgress = {
      uri: repo.uri,
      progress: 0,
      timestamp: new Date(),
    };
    return await this.objectsClient.create(REPOSITORY_CLONE_STATUS_INDEX_TYPE, progress, {
      id: repo.uri,
    });
  }
}
