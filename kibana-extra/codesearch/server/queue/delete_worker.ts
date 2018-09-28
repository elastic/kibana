/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@codesearch/esqueue';

import {
  REPOSITORY_DELETE_STATUS_INDEX_TYPE,
  REPOSITORY_GIT_STATUS_INDEX_TYPE,
  REPOSITORY_INDEX_STATUS_INDEX_TYPE,
  REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE,
} from '../../mappings';
import { RepositoryUri } from '../../model';
import { DeleteWorkerResult, WorkerProgress } from '../../model/repository';
import { DocumentIndexName, ReferenceIndexName, SymbolIndexName } from '../indexer/schema';
import { SavedObjectsClient } from '../kibana_types';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractWorker } from './abstract_worker';
import { CancellationSerivce } from './cancellation_service';
import { Job } from './job';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    private readonly objectsClient: SavedObjectsClient,
    protected readonly client: EsClient,
    private readonly cancellationService: CancellationSerivce
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;

    // Cancel running workers
    // TODO: Add support for clone/update worker.
    this.cancellationService.cancelIndexJob(uri);

    // 1. Delete repository on local fs.
    const repoService = new RepositoryService(dataPath, this.log);
    const deleteRepoPromise = this.deletePromiseWrapper(repoService.remove(uri), 'git data', uri);

    // 2. Delete repository status in ES.
    const deleteCloneStatusPromise = this.deletePromiseWrapper(
      this.objectsClient.delete(REPOSITORY_GIT_STATUS_INDEX_TYPE, uri),
      'git status',
      uri
    );

    const deleteLspIndexStatusPromise = this.deletePromiseWrapper(
      this.objectsClient.delete(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, uri),
      'LSP index status',
      uri
    );

    const deleteIndexStatusPromise = this.deletePromiseWrapper(
      this.objectsClient.delete(REPOSITORY_INDEX_STATUS_INDEX_TYPE, uri),
      'index status',
      uri
    );

    // 3. Delete ES indices.
    const deleteSymbolESIndexPromise = this.deletePromiseWrapper(
      this.client.indices.delete({ index: SymbolIndexName(uri) }),
      'symbol ES index',
      uri
    );

    const deleteReferenceESIndexPromise = this.deletePromiseWrapper(
      this.client.indices.delete({ index: ReferenceIndexName(uri) }),
      'reference ES index',
      uri
    );

    await Promise.all([
      deleteRepoPromise,
      deleteCloneStatusPromise,
      deleteLspIndexStatusPromise,
      deleteIndexStatusPromise,
      deleteSymbolESIndexPromise,
      deleteReferenceESIndexPromise,
    ]);

    // 4. Delete the document index where the repository document resides, so
    // that you won't be able to import the same repositories until they are
    // fully removed.
    await this.deletePromiseWrapper(
      this.client.indices.delete({ index: DocumentIndexName(uri) }),
      'document ES index',
      uri
    );

    return {
      uri,
      res: true,
    };
  }

  public async onJobEnqueued(job: Job) {
    const progress: WorkerProgress = {
      uri: job.payload.uri,
      progress: 0,
      timestamp: new Date(),
    };
    return await this.objectsClient.create(REPOSITORY_DELETE_STATUS_INDEX_TYPE, progress, {
      id: progress.uri,
    });
  }

  public async onJobCompleted(_: Job, res: DeleteWorkerResult) {
    return await this.objectsClient.delete(REPOSITORY_DELETE_STATUS_INDEX_TYPE, res.uri);
  }

  public async updateProgress(uri: string, progress: number) {
    const p: WorkerProgress = {
      uri,
      progress,
      timestamp: new Date(),
    };
    return await this.objectsClient.update(REPOSITORY_DELETE_STATUS_INDEX_TYPE, p.uri, p);
  }

  private deletePromiseWrapper(
    promise: Promise<any>,
    type: string,
    repoUri: RepositoryUri
  ): Promise<any> {
    return promise
      .then(() => {
        this.log.info(`Delete ${type} of repository ${repoUri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete ${type} of repository ${repoUri} error: ${error}`);
      });
  }
}
