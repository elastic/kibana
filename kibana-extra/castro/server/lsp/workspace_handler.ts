/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fs from 'fs';
import { Clone, Commit, Error, Repository, Reset } from 'nodegit';
import path from 'path';
import Url from 'url';
import { TextDocumentPositionParams } from 'vscode-languageserver';
import { LspRequest } from '../../model';
import { GitOperations } from '../git_operations';
import { Log } from '../log';

export class WorkspaceHandler {
  private workspacePath: string;
  private git: GitOperations;
  private log: Log;

  constructor(repoPath: string, workspacePath: string, log: Log) {
    this.workspacePath = workspacePath;
    this.git = new GitOperations(repoPath);
    this.log = log;
  }

  /**
   * open workspace for repositoryUri, updated it from bare repository if need.
   * @param repositoryUri the uri of bare repository.
   * @param revision
   */
  public async openWorkspace(repositoryUri: string, revision: string) {
    const bareRepo = await this.git.openRepo(repositoryUri);
    const targetCommit = await this.git.getCommit(bareRepo, revision);
    if (revision !== 'head') {
      await this.checkCommit(bareRepo, targetCommit);
      revision = 'head';
    }
    let workspaceRepo: Repository;
    if (this.workspaceExists(repositoryUri, revision)) {
      workspaceRepo = await this.updateWorkspace(repositoryUri, revision, targetCommit);
    } else {
      workspaceRepo = await this.cloneWorkspace(bareRepo, repositoryUri, revision);
    }
    const headCommit = await workspaceRepo.getHeadCommit();
    if (headCommit.sha() !== targetCommit.sha()) {
      const commit = await workspaceRepo.getCommit(targetCommit.sha());
      this.log.info(`checkout ${workspaceRepo.workdir()} to commit ${targetCommit.sha()}`);
      const result = await Reset.reset(workspaceRepo, commit, Reset.TYPE.HARD, {});
      if (result !== undefined && result !== Error.CODE.OK) {
        throw Boom.internal(`checkout workspace to commit ${targetCommit.sha()} failed.`);
      }
    }
    return workspaceRepo;
  }

  public async handleRequest(request: LspRequest): Promise<void> {
    const { method, params } = request;
    switch (method) {
      case 'textDocument/hover':
        const payload: TextDocumentPositionParams = params;
        const { filePath, workspacePath } = await this.resolveUri(params.textDocument.uri);
        if (filePath) {
          payload.textDocument.uri = request.resolvedFilePath = filePath;
          request.workspacePath = workspacePath;
        }
        break;
      default:
      // do nothing
    }
  }

  /**
   * convert a git uri to absolute file path, checkout code into workspace
   * @param uri the uri
   */
  private async resolveUri(uri: string) {
    if (uri.startsWith('git://')) {
      const url = Url.parse(uri);
      const domain = url.hostname;
      const repo = url.pathname;
      const revision = url.query ? url.query.toLocaleLowerCase() : 'head';
      const filePath = url.hash ? url.hash.substr(1) : '/';
      const repositoryUri = `${domain}/${repo}`;
      const workspaceRepo = await this.openWorkspace(repositoryUri, revision);
      return {
        workspacePath: workspaceRepo.workdir(),
        filePath: `file://${path.resolve(workspaceRepo.workdir(), filePath)}`,
        uri,
      };
    } else {
      return {
        workspacePath: undefined,
        filePath: undefined,
        uri,
      };
    }
  }

  private async checkCommit(repository: Repository, commit: Commit) {
    // we only support HEAD now.
    const head = await repository.getHeadCommit();
    if (head.sha() !== commit.sha()) {
      throw Boom.badRequest(`revision must be HEAD.`);
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
}
