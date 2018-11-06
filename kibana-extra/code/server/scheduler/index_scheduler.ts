/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';

import { RepositoryUtils } from '../../common/repository_utils';
import { CloneWorkerProgress, Repository, WorkerProgress } from '../../model';
import {
  RepositoryGitStatusReservedField,
  RepositoryIndexName,
  RepositoryLspIndexStatusReservedField,
  RepositoryReservedField,
  RepositoryStatusIndexName,
  RepositoryStatusTypeName,
  RepositoryTypeName,
} from '../indexer/schema';
import { Log } from '../log';
import { IndexWorker } from '../queue';
import { ServerOptions } from '../server_options';
import { AbstractScheduler } from './abstract_scheduler';

export class IndexScheduler extends AbstractScheduler {
  constructor(
    private readonly indexWorker: IndexWorker,
    private readonly serverOptions: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Log
  ) {
    super(client, serverOptions.indexFrequencyMs);
  }

  protected getRepoSchedulingFrequencyMs() {
    return this.serverOptions.indexRepoFrequencyMs;
  }

  protected async executeSchedulingJob(repo: Repository) {
    this.log.info(`Schedule index repo request for ${repo.uri}`);
    try {
      // This repository is too soon to execute the next index job.
      if (repo.nextIndexTimestamp && new Date() < new Date(repo.nextIndexTimestamp)) {
        this.log.debug(`Repo ${repo.uri} is too soon to execute the next index job.`);
        return;
      }

      const cloneStatusRes = await this.client.get({
        index: RepositoryStatusIndexName(repo.uri),
        type: RepositoryStatusTypeName,
        id: `${repo.uri}-git-status`,
      });
      const cloneStatus: CloneWorkerProgress =
        cloneStatusRes._source[RepositoryGitStatusReservedField];
      if (
        !RepositoryUtils.hasFullyCloned(cloneStatus.cloneProgress) ||
        cloneStatus.progress !== 100
      ) {
        this.log.info(`Repo ${repo.uri} has not been fully cloned yet or in update. Skip index.`);
        return;
      }

      const res = await this.client.get({
        index: RepositoryStatusIndexName(repo.uri),
        type: RepositoryStatusTypeName,
        id: `${repo.uri}-lsp-index-status`,
      });
      const repoIndexStatus: WorkerProgress = res._source[RepositoryLspIndexStatusReservedField];

      // Schedule index job only when the indexed revision is different from the current repository
      // revision.
      this.log.info(
        `Current repo revision: ${repo.revision}, indexed revision ${repoIndexStatus.revision}.`
      );
      if (repoIndexStatus.progress >= 0 && repoIndexStatus.progress < 100) {
        this.log.info(`Repo is still in indexing. Skip index for ${repo.uri}`);
      } else if (repoIndexStatus.progress === 100 && repoIndexStatus.revision === repo.revision) {
        this.log.info(`Repo does not change since last index. Skip index for ${repo.uri}.`);
      } else {
        const payload = {
          uri: repo.uri,
          revision: repo.revision,
          dataPath: this.serverOptions.repoPath,
        };

        // Update the next repo index timestamp.
        const nextRepoIndexTimestamp = this.repoNextSchedulingTime();
        this.client.update({
          index: RepositoryIndexName(repo.uri),
          type: RepositoryTypeName,
          id: repo.uri,
          body: JSON.stringify({
            doc: {
              [RepositoryReservedField]: {
                nextIndexTimestamp: nextRepoIndexTimestamp,
              },
            },
          }),
        });

        await this.indexWorker.enqueueJob(payload, {});
      }
    } catch (error) {
      this.log.info(`Schedule index job for ${repo.uri} error. ${error}`);
    }
  }
}
