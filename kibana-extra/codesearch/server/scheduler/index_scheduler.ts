/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';

import { REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE } from '../../mappings';
import { Repository, WorkerProgress } from '../../model';
import { Log } from '../log';
import { IndexWorker } from '../queue';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

export class IndexScheduler extends AbstractScheduler {
  constructor(
    private readonly indexWorker: IndexWorker,
    private readonly serverOptions: ServerOptions,
    private readonly objectsClient: any,
    client: EsClient,
    protected readonly log: Log
  ) {
    super(client);
    this.POLL_FREQUENCY_MS = this.serverOptions.indexFrequencyMs;
  }

  protected async executeJob(repo: Repository) {
    this.log.info(`Schedule index repo request for ${repo.uri}`);
    const res = await this.objectsClient.get(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, repo.uri);
    const repoIndexStatus: WorkerProgress = res.attributes;
    // Schedule index job only when the indexed revision is different from the current repository
    // revision.
    this.log.info(
      `Current repo revision: ${repo.revision}, indexed revision ${repoIndexStatus.revision}.`
    );
    if (repoIndexStatus.progress === 100 && repoIndexStatus.revision === repo.revision) {
      this.log.info(`Repo does not change since last index. Skip index for ${repo.uri}.`);
    } else {
      const payload = {
        uri: repo.uri,
        revision: repo.revision,
        dataPath: this.serverOptions.repoPath,
      };
      await this.indexWorker.enqueueJob(payload, {});
    }
  }
}
