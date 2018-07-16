/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Hapi from 'hapi';

import { AbstractWorker, Job } from '.';
import { Esqueue } from '../../lib/esqueue';
import { Log } from '../log';
import RepositoryService from '../repositoryService';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';

  private log: Log;

  constructor(protected readonly queue: Esqueue, protected readonly server: Hapi.Server) {
    super(queue, server);
    this.log = new Log(this.server);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;
    const repoService = new RepositoryService(dataPath, this.log);
    await repoService.remove(uri);
  }
}
