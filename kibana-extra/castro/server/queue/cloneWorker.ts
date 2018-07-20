/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from '@castro/esqueue';

import { AbstractWorker, Job } from '.';
import { RepositoryUtils } from '../../common/repositoryUtils';
import { Log } from '../log';
import { RepositoryService } from '../repositoryService';

export class CloneWorker extends AbstractWorker {
  public id: string = 'clone';

  constructor(protected readonly queue: Esqueue, protected readonly log: Log) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { url, dataPath } = job.payload;
    const repoService = new RepositoryService(dataPath, this.log);
    const repo = RepositoryUtils.buildRepository(url);
    await repoService.clone(repo);
  }
}
