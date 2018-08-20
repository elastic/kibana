/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@codesearch/esqueue';
import fs from 'fs';
import util from 'util';

import { RepositoryUtils } from '../../common/repository_utils';
import { Document, LspIndexRequest, RepositoryUri } from '../../model';
import { GitOperations } from '../git_operations';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { detectLanguage } from '../utils/detect_language';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import {
  DocumentAnalysisSettings,
  DocumentIndexName,
  DocumentSchema,
  DocumentTypeName,
  SymbolAnalysisSettings,
  SymbolIndexName,
  SymbolSchema,
  SymbolTypeName,
} from './schema';

export class LspIndexer extends AbstractIndexer {
  protected type: string = 'lsp';

  constructor(
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Log
  ) {
    super(client, log);
  }

  protected async prepareIndexCreationRequests(repoUri: RepositoryUri) {
    const contentIndexCreationReq: IndexCreationRequest = {
      index: DocumentIndexName(repoUri),
      type: DocumentTypeName,
      settings: {
        ...DocumentAnalysisSettings,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: DocumentSchema,
    };
    const symbolIndexCreationReq: IndexCreationRequest = {
      index: SymbolIndexName(repoUri),
      type: SymbolTypeName,
      settings: {
        ...SymbolAnalysisSettings,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: SymbolSchema,
    };
    return [contentIndexCreationReq, symbolIndexCreationReq];
  }

  protected async prepareRequests(repoUri: RepositoryUri) {
    const {
      workspaceRepo,
      workspaceRevision,
    } = await this.lspService.workspaceHandler.openWorkspace(repoUri, 'head');
    const workspaceDir = workspaceRepo.workdir();
    const gitOperator = new GitOperations(this.options.repoPath);
    try {
      const fileTree = await gitOperator.fileTree(repoUri, '');
      return RepositoryUtils.getAllFiles(fileTree).map((filePath: string) => {
        const req: LspIndexRequest = {
          repoUri,
          localRepoPath: workspaceDir,
          filePath,
          revision: workspaceRevision,
        };
        return req;
      });
    } catch (e) {
      this.log.error(`Prepare lsp indexing requests error: ${e}`);
      throw e;
    }
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
    const symbolNames = new Set<string>();
    for (const symbol of symbols) {
      await this.client.index({
        index: SymbolIndexName(repoUri),
        type: SymbolTypeName,
        id: `${repoUri}:${revision}:${filePath}:${symbol.symbolInformation.name}`,
        body: symbol,
      });
      symbolNames.add(symbol.symbolInformation.name);
    }

    const localFilePath = `${localRepoPath}${filePath}`;
    const readFile = util.promisify(fs.readFile);
    const content = await readFile(localFilePath, 'utf8');
    const language = await detectLanguage(filePath, Buffer.from(content));
    const body: Document = {
      repoUri,
      path: filePath,
      content,
      language,
      qnames: Array.from(symbolNames),
    };
    await this.client.index({
      index: DocumentIndexName(repoUri),
      type: DocumentTypeName,
      id: `${repoUri}:${revision}:${filePath}`,
      body,
    });
    return;
  }
}
