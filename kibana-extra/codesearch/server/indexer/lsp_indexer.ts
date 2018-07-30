/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';
import fs from 'fs';
import _ from 'lodash';
import util from 'util';
import walk from 'walk';

import { RepositoryUtils } from '../../common/repository_utils';
import { Document, LspIndexRequest, RepositoryUri } from '../../model';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import { DocumentSchema, SymbolSchema } from './schema';

export class LspIndexer extends AbstractIndexer {
  protected type: string = 'lsp';

  constructor(
    protected readonly lspService: LspService,
    protected readonly client: EsClient,
    protected readonly serverOption: ServerOptions,
    protected readonly log: Log
  ) {
    super(client, serverOption, log);
  }

  protected async prepareIndexCreationRequests(repoUri: RepositoryUri) {
    const contentIndexCreationReq: IndexCreationRequest = {
      index: `.codesearch-document-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`,
      type: 'document',
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: DocumentSchema,
    };
    const symbolIndexCreationReq: IndexCreationRequest = {
      index: `.codesearch-symbol-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`,
      type: 'symbol',
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: SymbolSchema,
    };
    return [contentIndexCreationReq, symbolIndexCreationReq];
  }

  protected async prepareRequests(repoUri: RepositoryUri) {
    // TODO: get workspaceRevision and apply it to the doc as wel.
    const {
      workspaceRepo,
      workspaceRevision,
    } = await this.lspService.workspaceHandler.openWorkspace(repoUri, 'head');
    const path = workspaceRepo.workdir();
    const walker = walk.walk(path, { followLinks: false });

    return new Promise<LspIndexRequest[]>((resolve: any, reject) => {
      try {
        const reqs: LspIndexRequest[] = [];
        walker.on('file', (root: string, stat: any, next: () => void) => {
          const filePath = _.replace(root, path + '/', '') + '/' + stat.name;
          if (this.fileFilter(filePath)) {
            // Add this file to the list of files
            const req: LspIndexRequest = {
              repoUri,
              localRepoPath: path,
              filePath,
              revision: workspaceRevision,
            };
            reqs.push(req);
          }
          next();
        });

        walker.on('end', () => {
          resolve(reqs);
        });
      } catch (error) {
        reject();
      }
    });
  }

  protected async processRequest(request: LspIndexRequest) {
    const { repoUri, revision, filePath, localRepoPath } = request;
    const lspDocUri = `git://${repoUri}?${revision}#${filePath}`;
    const response = await this.lspService.sendRequest('textDocument/full', {
      textDocument: {
        uri: lspDocUri,
      },
    });

    const symbols = response.result[0].symbols;
    const symbolNames = [];
    for (const symbol of symbols) {
      await this.client.index({
        index: `.codesearch-symbol-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`,
        type: 'symbol',
        body: symbol,
      });
      symbolNames.push(symbol.symbolInformation.name);
    }

    const localFilePath = `${localRepoPath}${filePath}`;
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(localFilePath, 'utf8');
    const body: Document = {
      repoUri,
      path: filePath,
      content,
      qnames: symbolNames,
    };
    await this.client.index({
      index: `.codesearch-document-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`,
      type: 'document',
      body,
    });
    return;
  }

  private fileFilter(filePath: string): boolean {
    return !filePath.startsWith('.git');
  }
}
