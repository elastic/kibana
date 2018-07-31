/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from 'packages/codesearch-esqueue';

import { RepositoryUri } from 'model';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import { repositoryIndexName, RepositorySchema, repositoryTypeName } from './schema';

// Inherit AbstractIndexer's index creation logics. This is not an actual indexer.
export class RepositoryIndexInitializer extends AbstractIndexer {
  protected type: string = 'repository';

  constructor(
    protected readonly client: EsClient,
    protected readonly serverOption: ServerOptions,
    protected readonly log: Log
  ) {
    super(client, serverOption, log);
  }

  public async prepareIndexCreationRequests(_: RepositoryUri) {
    const creationReq: IndexCreationRequest = {
      index: repositoryIndexName(),
      type: repositoryTypeName,
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: RepositorySchema,
    };
    return [creationReq];
  }

  public async init() {
    const res = await this.prepareIndex('');
    if (!res) {
      this.log.error(`Initialize repository index failed.`);
    }
    return;
  }
}
