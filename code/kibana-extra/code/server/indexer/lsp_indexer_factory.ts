/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';

import { RepositoryUri } from '../../model';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { IndexerFactory, LspIndexer } from './';

export class LspIndexerFactory implements IndexerFactory {
  constructor(
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Log
  ) {}

  public create(repoUri: RepositoryUri, revision: string) {
    return new LspIndexer(repoUri, revision, this.lspService, this.options, this.client, this.log);
  }
}
