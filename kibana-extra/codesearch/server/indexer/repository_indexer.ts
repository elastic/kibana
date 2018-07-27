/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryIndexRequest, RepositoryUri } from '../../model';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { AbstractIndexer } from './abstract_indexer';

export class RepositoryIndexer extends AbstractIndexer {
  protected type: string = 'repository';

  constructor(protected readonly serverOption: ServerOptions, protected readonly log: Log) {
    super(serverOption, log);
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
    this.log.debug(`index repository for ${request}`);
    return;
  }
}
