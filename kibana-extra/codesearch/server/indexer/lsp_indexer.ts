/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import walk from 'walk';

import { LspIndexRequest, RepositoryUri } from 'model';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { AbstractIndexer } from './abstract_indexer';

export class LspIndexer extends AbstractIndexer {
  protected type: string = 'lsp';

  constructor(
    protected readonly lspService: LspService,
    protected readonly serverOption: ServerOptions,
    protected readonly log: Log
  ) {
    super(serverOption, log);
  }

  public async prepareRequests(repoUri: RepositoryUri) {
    const workspace = await this.lspService.workspaceHandler.openWorkspace(repoUri, 'head');
    const path = workspace.workdir();
    const walker = walk.walk(path, { followLinks: false });

    return new Promise<LspIndexRequest[]>((resolve: any, reject) => {
      try {
        const files: LspIndexRequest[] = [];
        walker.on('file', (root: string, stat: any, next: () => void) => {
          // Add this file to the list of files
          const req: LspIndexRequest = {
            repoUri,
            filePath: root + '/' + stat.name,
          };
          files.push(req);
          next();
        });

        walker.on('end', () => {
          resolve(files);
        });
      } catch (error) {
        reject();
      }
    });
  }

  public async processRequest(request: LspIndexRequest) {
    // TODO: add the real lsp data indexing logic.
    this.log.debug(`index lsp data for ${request}`);
    return;
  }
}
