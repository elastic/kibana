/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fs from 'fs';
import { Clone, Commit, Error, Repository, Reset } from 'nodegit';
import path from 'path';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Hover, Location, TextDocumentPositionParams } from 'vscode-languageserver';

import { Full } from '@codesearch/lsp-extension';
import { DetailSymbolInformation } from '@codesearch/lsp-extension';

import rimraf from 'rimraf';
import { RepositoryUtils } from '../../common/repository_utils';
import { parseLspUrl } from '../../common/uri_util';
import { REPOSITORY_GIT_STATUS_INDEX_TYPE } from '../../mappings';
import { CloneWorkerProgress, LspRequest } from '../../model';
import { getDefaultBranch, GitOperations } from '../git_operations';
import { Logger } from '../log';
import { LoggerFactory } from '../utils/log_factory';

export const MAX_RESULT_COUNT = 20;

export class WorkspaceHandler {
  private git: GitOperations;
  private revisionMap: { [uri: string]: string } = {};
  private log: Logger;

  constructor(
    readonly repoPath: string,
    private readonly workspacePath: string,
    private readonly objectsClient: any,
    loggerFactory: LoggerFactory
  ) {
    this.git = new GitOperations(repoPath);
    this.log = loggerFactory.getLogger(['LSP', 'workspace']);
  }

  /**
   * open workspace for repositoryUri, updated it from bare repository if need.
   * @param repositoryUri the uri of bare repository.
   * @param revision
   */
  public async openWorkspace(repositoryUri: string, revision: string) {
    try {
      const res = await this.objectsClient.get(REPOSITORY_GIT_STATUS_INDEX_TYPE, repositoryUri);
      const gitStatus: CloneWorkerProgress = res.attributes;
      if (!RepositoryUtils.hasFullyCloned(gitStatus.cloneProgress) && gitStatus.progress !== 100) {
        throw Boom.internal(`repository has not been fully cloned yet.`);
      }
    } catch (error) {
      throw Boom.internal(`checkout workspace on an unknown status repository`);
    }

    const bareRepo = await this.git.openRepo(repositoryUri);
    const targetCommit = await this.git.getCommit(bareRepo, revision);
    const defaultBranch = await getDefaultBranch(bareRepo.workdir());
    if (revision !== defaultBranch) {
      await this.checkCommit(bareRepo, targetCommit);
      revision = defaultBranch;
    }
    let workspaceRepo: Repository;
    if (this.workspaceExists(repositoryUri, revision)) {
      workspaceRepo = await this.updateWorkspace(repositoryUri, revision, targetCommit);
    } else {
      workspaceRepo = await this.cloneWorkspace(bareRepo, repositoryUri, revision);
    }

    const workspaceHeadCommit = await workspaceRepo.getHeadCommit();
    if (workspaceHeadCommit.sha() !== targetCommit.sha()) {
      const commit = await workspaceRepo.getCommit(targetCommit.sha());
      this.log.info(`checkout ${workspaceRepo.workdir()} to commit ${targetCommit.sha()}`);
      const result = await Reset.reset(workspaceRepo, commit, Reset.TYPE.HARD, {});
      if (result !== undefined && result !== Error.CODE.OK) {
        throw Boom.internal(`checkout workspace to commit ${targetCommit.sha()} failed.`);
      }
    }
    this.setWorkspaceRevision(workspaceRepo, workspaceHeadCommit);
    return { workspaceRepo, workspaceRevision: workspaceHeadCommit.sha().substring(0, 7) };
  }

  public listWorkspaceFolders(repoUri: string) {
    const workspaceDir = path.join(this.workspacePath, repoUri);
    const isDir = (source: string) => fs.lstatSync(source).isDirectory();
    return fs
      .readdirSync(workspaceDir)
      .map(name => path.join(workspaceDir, name))
      .filter(isDir);
  }

  public clearWorkspace(repoUri: string, revision?: string) {
    const workspaceDir = path.join(this.workspacePath, repoUri);
    if (revision) {
      rimraf.sync(path.join(workspaceDir, revision));
    } else {
      rimraf.sync(path.join(workspaceDir));
    }
  }

  public async handleRequest(request: LspRequest): Promise<void> {
    const { method, params } = request;
    switch (method) {
      case 'textDocument/definition':
      case 'textDocument/hover':
      case 'textDocument/references':
      case 'textDocument/documentSymbol':
      case 'textDocument/full': {
        const payload: TextDocumentPositionParams = params;
        const { filePath, workspacePath, workspaceRevision } = await this.resolveUri(
          params.textDocument.uri
        );
        if (filePath) {
          payload.textDocument.uri = request.resolvedFilePath = filePath;
          request.workspacePath = workspacePath;
          request.workspaceRevision = workspaceRevision;
        }
        break;
      }
      default:
      // do nothing
    }
  }

  public handleResponse(request: LspRequest, response: ResponseMessage): ResponseMessage {
    const { method } = request;
    switch (method) {
      case 'textDocument/hover': {
        const result = response.result as Hover;
        this.handleHoverContents(result);
        return response;
      }
      case 'textDocument/definition': {
        const result = response.result;
        if (result) {
          if (Array.isArray(result)) {
            (result as Location[]).forEach(location => this.convertLocation(location));
          } else {
            this.convertLocation(result);
          }
        }
        return response;
      }
      case 'textDocument/full': {
        // unify the result of full as a array.
        const result = Array.isArray(response.result)
          ? (response.result as Full[])
          : [response.result as Full];
        for (const full of result) {
          if (full.symbols) {
            for (const symbol of full.symbols) {
              const parsedLocation = this.convertLocation(symbol.symbolInformation.location);
              if (parsedLocation) {
                symbol.repoUri = parsedLocation.repoUri;
                symbol.revision = parsedLocation.revision;
              }
              if (symbol.contents !== null || symbol.contents !== undefined) {
                this.handleHoverContents(symbol);
              }
            }
          }
          if (full.references) {
            for (const reference of full.references) {
              this.convertLocation(reference.location);
            }
          }
        }
        response.result = result;
        return response;
      }
      case 'textDocument/references': {
        if (response.result) {
          const locations = (response.result as Location[]).slice(0, MAX_RESULT_COUNT);
          for (const location of locations) {
            this.convertLocation(location);
          }
          response.result = locations;
        }
        return response;
      }
      case 'textDocument/documentSymbol': {
        if (response.result) {
          for (const symbol of response.result) {
            this.convertLocation(symbol.location);
          }
        }
        return response;
      }
      default:
        return response;
    }
  }

  private handleHoverContents(result: Hover | DetailSymbolInformation) {
    if (!Array.isArray(result.contents)) {
      if (typeof result.contents === 'string') {
        result.contents = [{ language: '', value: result.contents }];
      } else {
        result.contents = [result.contents as { language: string; value: string }];
      }
    } else {
      result.contents = Array.from(result.contents).map(c => {
        if (typeof c === 'string') {
          return { language: '', value: c };
        } else {
          return c;
        }
      });
    }
  }

  // todo add an unit test
  private parseLocation(location: Location) {
    const uri = location.uri;
    if (uri && uri.startsWith('file://')) {
      const filePath = uri.substring('file://'.length);
      if (filePath.startsWith(this.workspacePath)) {
        const relativePath = path.relative(this.workspacePath, filePath);
        const regex = /^(.*?\/.*?\/.*?)\/(.*?)\/(.*)$/;
        const m = relativePath.match(regex);
        if (m) {
          const repoUri = m[1];
          const revision = m[2];
          const gitRevision = this.revisionMap[`${repoUri}/${revision}`] || revision;
          const file = m[3];
          return { repoUri, revision: gitRevision, file };
        }
      }
    }
    return null;
  }

  private convertLocation(location: Location) {
    const parsedLocation = this.parseLocation(location);
    if (parsedLocation) {
      const { repoUri, revision, file } = parsedLocation;
      location.uri = `git://${repoUri}/blob/${revision}/${file}`;
    }
    return parsedLocation;
  }

  /**
   * convert a git uri to absolute file path, checkout code into workspace
   * @param uri the uri
   */
  private async resolveUri(uri: string) {
    if (uri.startsWith('git://')) {
      const { repoUri, file, revision } = parseLspUrl(uri)!;
      const { workspaceRepo, workspaceRevision } = await this.openWorkspace(repoUri, revision);
      return {
        workspacePath: workspaceRepo.workdir(),
        filePath: `file://${path.resolve(workspaceRepo.workdir(), file || '/')}`,
        uri,
        workspaceRevision,
      };
    } else {
      return {
        workspacePath: undefined,
        workspaceRevision: undefined,
        filePath: undefined,
        uri,
      };
    }
  }

  private async checkCommit(repository: Repository, commit: Commit) {
    // we only support headCommit now.
    const headCommit = await repository.getHeadCommit();
    if (headCommit.sha() !== commit.sha()) {
      throw Boom.badRequest(`revision must be master.`);
    }
  }

  private workspaceExists(repositoryUri: string, revision: string) {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    return fs.existsSync(workspaceDir);
  }

  private async updateWorkspace(
    repositoryUri: string,
    revision: string,
    targetCommit: Commit
  ): Promise<Repository> {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    const workspaceRepo = await Repository.open(workspaceDir);
    const workspaceHead = await workspaceRepo.getHeadCommit();
    if (workspaceHead.sha() !== targetCommit.sha()) {
      this.log.info(`fetch workspace ${workspaceDir} from origin`);
      await workspaceRepo.fetch('origin');
    }
    return workspaceRepo;
  }

  private async cloneWorkspace(
    bareRepo: Repository,
    repositoryUri: string,
    revision: string
  ): Promise<Repository> {
    const workspaceDir = path.join(this.workspacePath, repositoryUri, revision);
    this.log.info(`clone workspace ${workspaceDir} from url ${bareRepo.path()}`);
    return await Clone.clone(bareRepo.path(), workspaceDir);
  }

  private setWorkspaceRevision(workspaceRepo: Repository, headCommit: Commit) {
    const workspaceRelativePath = path.relative(this.workspacePath, workspaceRepo.workdir());
    this.revisionMap[workspaceRelativePath] = headCommit.sha().substring(0, 7);
  }
}
