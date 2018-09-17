/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';

import { Repository } from '../../model';
import { Log } from '../log';
import { UpdateWorker } from '../queue';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

export class UpdateScheduler extends AbstractScheduler {
  constructor(
    private readonly updateWorker: UpdateWorker,
    private readonly serverOptions: ServerOptions,
    client: EsClient,
    protected readonly log: Log
  ) {
    super(client);
    this.POLL_FREQUENCY_MS = this.serverOptions.updateFrequencyMs;
  }

  // TODO: Currently the schduling algorithm the most naive one, which go through
  // all repositories and execute update. Later we can repeat the one we used
  // before for task throttling.
  protected async executeJob(repo: Repository) {
    this.log.info(`Schedule update repo request for ${repo.uri}`);
    const payload = {
      uri: repo.uri,
      dataPath: this.serverOptions.repoPath,
    };
    await this.updateWorker.enqueueJob(payload, {});
  }
}
