/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';

import { AbstractWorker, Job } from '.';
import RepositoryUtils from '../../common/repositoryUtils';
import { Esqueue } from '../../lib/esqueue';
import { Log } from '../log';
import RepositoryService from '../repositoryService';

export class CloneWorker extends AbstractWorker {
  public id: string = 'clone';

  private log: Log;

  constructor(protected readonly queue: Esqueue, protected readonly server: Hapi.Server) {
    super(queue, server);
    this.log = new Log(this.server);
  }

  public async executeJob(job: Job) {
    const { url, dataPath } = job.payload;
    const repoService = new RepositoryService(dataPath, this.log);
    const repo = RepositoryUtils.buildRepository(url);
    await repoService.clone(repo);
  }
}
