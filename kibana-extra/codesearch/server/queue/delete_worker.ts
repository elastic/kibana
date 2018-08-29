/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient, Esqueue } from '@codesearch/esqueue';

import {
  REPOSITORY_CLONE_STATUS_INDEX_TYPE,
  REPOSITORY_DELETE_STATUS_INDEX_TYPE,
  REPOSITORY_INDEX_STATUS_INDEX_TYPE,
  REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE,
} from '../../mappings';
import { DeleteWorkerResult, WorkerProgress } from '../../model/repository';
import { DocumentIndexName, SymbolIndexName } from '../indexer/schema';
import { Log } from '../log';
import { RepositoryService } from '../repository_service';
import { AbstractWorker } from './abstract_worker';
import { Job } from './job';

export class DeleteWorker extends AbstractWorker {
  public id: string = 'delete';

  constructor(
    protected readonly queue: Esqueue,
    protected readonly log: Log,
    private readonly objectsClient: any,
    protected readonly client: EsClient
  ) {
    super(queue, log);
  }

  public async executeJob(job: Job) {
    const { uri, dataPath } = job.payload;

    // 1. Delete repository on local fs.
    const repoService = new RepositoryService(dataPath, this.log);
    const deleteRepoPromise = repoService
      .remove(uri)
      .then(() => {
        this.log.info(`Delete git repository ${uri} done.`);
      })
      .catch(error => {
        this.log.error(`Delete git repository ${uri} error: ${error}`);
      });

    // 2. Delete repository status in ES.
    const deleteCloneStatusPromise = this.objectsClient
      .delete(REPOSITORY_CLONE_STATUS_INDEX_TYPE, uri)
      .then(() => {
        this.log.info(`Delete clone status of repository ${uri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete clone status of repository ${uri} error: ${error}`);
      });

    const deleteLspIndexStatusPromise = this.objectsClient
      .delete(REPOSITORY_LSP_INDEX_STATUS_INDEX_TYPE, uri)
      .then(() => {
        this.log.info(`Delete LSP index status of repository ${uri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete LSP index status of repository ${uri} error: ${error}`);
      });

    const deleteIndexStatusPromise = this.objectsClient
      .delete(REPOSITORY_INDEX_STATUS_INDEX_TYPE, uri)
      .then(() => {
        this.log.info(`Delete index status of repository ${uri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete index status of repository ${uri} error: ${error}`);
      });

    // 3. Delete ES indices.
    const deleteSymbolESIndexPromise = this.client.indices
      .delete({ index: SymbolIndexName(uri) })
      .then(() => {
        this.log.info(`Delete symbol es index of repository ${uri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete symbol es index of repository ${uri} error: ${error}`);
      });

    // Excecute all the promises above in parallel.
    await Promise.all([
      deleteRepoPromise,
      deleteCloneStatusPromise,
      deleteLspIndexStatusPromise,
      deleteIndexStatusPromise,
      deleteSymbolESIndexPromise,
    ]);

    // 4. Delete the document index where the repository document resides, so
    // that you won't be able to import the same repositories until they are
    // fully removed.
    await this.client.indices
      .delete({ index: DocumentIndexName(uri) })
      .then(() => {
        this.log.info(`Delete document es index of repository ${uri} done.`);
      })
      .catch((error: Error) => {
        this.log.error(`Delete document es index of repository ${uri} error: ${error}`);
      });

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

  public async onJobCompleted(res: DeleteWorkerResult) {
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
}
