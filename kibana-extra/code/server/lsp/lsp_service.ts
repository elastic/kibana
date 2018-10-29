/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { LanguageServerController } from './controller';
import { WorkspaceHandler } from './workspace_handler';

export class LspService {
  public readonly controller: LanguageServerController;
  public readonly workspaceHandler: WorkspaceHandler;
  constructor(
    targetHost: string,
    serverOptions: ServerOptions,
    objectsClient: any,
    loggerFactory: LoggerFactory
  ) {
    this.workspaceHandler = new WorkspaceHandler(
      serverOptions.repoPath,
      serverOptions.workspacePath,
      objectsClient,
      loggerFactory
    );
    this.controller = new LanguageServerController(serverOptions, targetHost, loggerFactory);
  }

  public async sendRequest(method: string, params: any): Promise<ResponseMessage> {
    const request = { method, params };
    await this.workspaceHandler.handleRequest(request);
    const response = await this.controller.handleRequest(request);
    return this.workspaceHandler.handleResponse(request, response);
  }

  public async launchServers() {
    // TODO read from config which LSP should be used
    await this.controller.launchServers();
  }

  public async deleteWorkspace(repoUri: string) {
    for (const path of this.workspaceHandler.listWorkspaceFolders(repoUri)) {
      await this.controller.unloadWorkspace(path);
    }
    this.workspaceHandler.clearWorkspace(repoUri);
  }

  /**
   * shutdown all launched language servers
   */
  public async shutdown() {
    await this.controller.exit();
  }

  public supportLanguage(lang: string) {
    return this.controller.supportLanguage(lang);
  }
}
