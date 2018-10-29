/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';
import fs from 'fs';
import util from 'util';

import { RepositoryUtils } from '../../common/repository_utils';
import { toCanonicalUrl } from '../../common/uri_util';
import { Document, LspIndexRequest, RepositoryUri } from '../../model';
import { GitOperations } from '../git_operations';
import { Log } from '../log';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { detectLanguage, detectLanguageByFilename } from '../utils/detect_language';
import { AbstractIndexer } from './abstract_indexer';
import { IndexCreationRequest } from './index_creation_request';
import {
  DocumentAnalysisSettings,
  DocumentIndexName,
  DocumentSchema,
  DocumentTypeName,
  ReferenceIndexName,
  ReferenceSchema,
  ReferenceTypeName,
  RepositoryReservedField,
  SymbolAnalysisSettings,
  SymbolIndexName,
  SymbolSchema,
  SymbolTypeName,
} from './schema';

export class LspIndexer extends AbstractIndexer {
  protected type: string = 'lsp';
  // Currently without the multi revision support, we use this placeholder revision string
  // to construct any ES document id.
  private PLACEHOLDER_REVISION: string = 'head';

  constructor(
    protected readonly repoUri: RepositoryUri,
    protected readonly revision: string,
    protected readonly lspService: LspService,
    protected readonly options: ServerOptions,
    protected readonly client: EsClient,
    protected readonly log: Log
  ) {
    super(repoUri, revision, client, log);
  }

  protected async prepareIndexCreationRequests() {
    const contentIndexCreationReq: IndexCreationRequest = {
      index: DocumentIndexName(this.repoUri),
      type: DocumentTypeName,
      settings: {
        ...DocumentAnalysisSettings,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: DocumentSchema,
    };
    const symbolIndexCreationReq: IndexCreationRequest = {
      index: SymbolIndexName(this.repoUri),
      type: SymbolTypeName,
      settings: {
        ...SymbolAnalysisSettings,
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: SymbolSchema,
    };
    const referenceIndexCreationReq: IndexCreationRequest = {
      index: ReferenceIndexName(this.repoUri),
      type: ReferenceTypeName,
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
      },
      schema: ReferenceSchema,
    };
    return [contentIndexCreationReq, symbolIndexCreationReq, referenceIndexCreationReq];
  }

  protected async prepareRequests() {
    try {
      const {
        workspaceRepo,
        workspaceRevision,
      } = await this.lspService.workspaceHandler.openWorkspace(this.repoUri, 'head');
      const workspaceDir = workspaceRepo.workdir();
      const gitOperator = new GitOperations(this.options.repoPath);
      const fileTree = await gitOperator.fileTree(this.repoUri, '');
      return RepositoryUtils.getAllFiles(fileTree)
        .filter((filePath: string) => {
          const lang = detectLanguageByFilename(filePath);
          return lang && this.lspService.supportLanguage(lang);
        })
        .map((filePath: string) => {
          const req: LspIndexRequest = {
            repoUri: this.repoUri,
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

  protected async cleanIndex(repoUri: RepositoryUri) {
    // Clean up all the symbol documents in the symbol index
    try {
      await this.client.deleteByQuery({
        index: SymbolIndexName(repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up symbols for ${repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up symbols for ${repoUri} error: ${error}`);
    }

    // Clean up all the reference documents in the reference index
    try {
      await this.client.deleteByQuery({
        index: ReferenceIndexName(repoUri),
        body: {
          query: {
            match_all: {},
          },
        },
      });
      this.log.info(`Clean up references for ${repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up references for ${repoUri} error: ${error}`);
    }

    // Clean up all the document documents in the document index but keep the repository document.
    try {
      await this.client.deleteByQuery({
        index: DocumentIndexName(repoUri),
        body: {
          query: {
            bool: {
              must_not: [
                {
                  exists: {
                    field: RepositoryReservedField,
                  },
                },
              ],
            },
          },
        },
      });
      this.log.info(`Clean up documents for ${repoUri} done.`);
    } catch (error) {
      this.log.error(`Clean up documents for ${repoUri} error: ${error}`);
    }
  }

  protected async processRequest(request: LspIndexRequest) {
    const { repoUri, revision, filePath, localRepoPath } = request;
    const lspDocUri = toCanonicalUrl({ repoUri, revision, file: filePath, schema: 'git:' });
    const response = await this.lspService.sendRequest('textDocument/full', {
      textDocument: {
        uri: lspDocUri,
        reference: this.options.enableGlobalReference,
      },
    });

    const symbolNames = new Set<string>();
    if (response && response.result.length > 0) {
      const { symbols, references } = response.result[0];
      for (const symbol of symbols) {
        await this.client.index({
          index: SymbolIndexName(repoUri),
          type: SymbolTypeName,
          id: `${repoUri}:${this.PLACEHOLDER_REVISION}:${filePath}:${
            symbol.symbolInformation.name
          }`,
          body: symbol,
        });
        symbolNames.add(symbol.symbolInformation.name);
      }

      for (const ref of references) {
        await this.client.index({
          index: ReferenceIndexName(repoUri),
          type: ReferenceTypeName,
          id: `${repoUri}:${this.PLACEHOLDER_REVISION}:${filePath}:${ref.location.uri}:${
            ref.location.range.start.line
          }:${ref.location.range.start.character}`,
          body: ref,
        });
      }
    } else {
      this.log.debug(`Empty response from lsp server. Skip symbols and references indexing.`);
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
      id: `${repoUri}:${this.PLACEHOLDER_REVISION}:${filePath}`,
      body,
    });
    return;
  }
}
