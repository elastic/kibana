/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from 'packages/codesearch-esqueue';

import { RepositoryIndexRequest, RepositoryUri } from 'model';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import { RepositorySchema } from './schema';

export class RepositoryIndexer extends AbstractIndexer {
  protected type: string = 'repository';

  constructor(
    protected readonly client: EsClient,
    protected readonly serverOption: ServerOptions,
    protected readonly log: Log
  ) {
    super(client, serverOption, log);
  }

  public async prepareIndexCreationRequests(repoUri: RepositoryUri) {
    const creationReq: IndexCreationRequest = {
      index: '.codesearch-repository',
      type: 'repository',
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: RepositorySchema,
    };
    return [creationReq];
  }

  public async prepareRequests(repoUri: RepositoryUri) {
    return new Promise<RepositoryIndexRequest[]>((resolve, reject) => {
      const req: RepositoryIndexRequest = {
        repoUri,
      };
      // Always return just one single repository
      resolve([req]);
    });
  }

  public async processRequest(request: RepositoryIndexRequest) {
    // TODO: add the real repository indexing logic by lsp controller.
    this.log.info(`index repository for ${JSON.stringify(request)}`);
    return;
  }
}
