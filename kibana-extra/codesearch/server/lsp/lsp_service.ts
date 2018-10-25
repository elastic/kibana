/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Hapi from 'hapi';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { LanguageServerController } from './controller';
import { WorkspaceHandler } from './workspace_handler';

export class LspService {
  public readonly controller: LanguageServerController;
  public readonly workspaceHandler: WorkspaceHandler;
  constructor(
    targetHost: string,
    server: Hapi.Server,
    serverOptions: ServerOptions,
    objectsClient: any
  ) {
    this.workspaceHandler = new WorkspaceHandler(
      serverOptions.repoPath,
      serverOptions.workspacePath,
      objectsClient,
      new Log(server, ['LSP', 'workspace'])
    );
    this.controller = new LanguageServerController(serverOptions, targetHost, server);
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

  public supportLanguage(lang: string) {
    return this.controller.supportLanguage(lang);
  }
}
