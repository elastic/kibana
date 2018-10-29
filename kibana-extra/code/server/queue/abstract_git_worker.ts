/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@code/esqueue';

import { RepositoryUtils } from '../../common/repository_utils';
import { REPOSITORY_GIT_STATUS_INDEX_TYPE } from '../../mappings';
import { CloneProgress, CloneWorkerProgress, CloneWorkerResult } from '../../model';
import { getDefaultBranch, getHeadRevision } from '../git_operations';
import {
  RepositoryIndexName,
  RepositoryReservedField,
  RepositoryTypeName,
} from '../indexer/schema';
import { SavedObjectsClient } from '../kibana_types';
import { Log } from '../log';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export abstract class AbstractGitWorker extends AbstractWorker {
  public id: string = 'abstract-git';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    protected readonly objectsClient: SavedObjectsClient,
    protected readonly client: EsClient
  ) {
    super(queue, log);
  }

  public async onJobCompleted(job: Job, res: CloneWorkerResult) {
    // Update the default branch.
    const { dataPath } = job.payload;
    const repoUri = res.uri;
    const localPath = RepositoryUtils.repositoryLocalPath(dataPath, repoUri);
    const revision = await getHeadRevision(localPath);
    const defaultBranch = await getDefaultBranch(localPath);

    // Update the repository data.
    this.client.update({
      index: RepositoryIndexName(repoUri),
      type: RepositoryTypeName,
      id: repoUri,
      body: JSON.stringify({
        doc: {
          [RepositoryReservedField]: {
            defaultBranch,
            revision,
          },
        },
      }),
    });

    // Update the git operation status.
    try {
      return await this.objectsClient.update(REPOSITORY_GIT_STATUS_INDEX_TYPE, repoUri, {
        revision,
        progress: 100,
        cloneProgress: {
          isCloned: true,
        },
      });
    } catch (error) {
      this.log.debug(`Update revision of repo clone progress error: ${error}`);
    }

    return await super.onJobCompleted(job, res);
  }

  public async updateProgress(uri: string, progress: number, cloneProgress?: CloneProgress) {
    const p: CloneWorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
      cloneProgress,
    };
    try {
      return await this.objectsClient.update(REPOSITORY_GIT_STATUS_INDEX_TYPE, p.uri, p);
    } catch (error) {
      this.log.debug(`Update git clone progress error: ${error}`);
    }
  }
}
