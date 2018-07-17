/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Hapi from 'hapi';

import { Logger } from 'vscode-jsonrpc';
import {
  ClientCapabilities,
  InitializeResult,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol/lib/main';
import { Log } from '../log';
import { LanguageServerProxy } from './proxy';

import getPort from 'get-port';

import { serve } from 'javascript-typescript-langserver/lib/server';

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController {
  /** Map from langauge type to Lsp Server Controller */
  private lsps: LanguageServerProxy[] = [];
  private readonly targetHost?: string;
  private readonly lspLogger?: Logger;
  private log: Log;

  constructor(targetHost: string, lspLoger: Logger, server: Hapi.Server) {
    this.targetHost = targetHost;
    this.lspLogger = lspLoger;
    this.log = new Log(server);
  }

  public listen() {
    for (const lsp of this.lsps) {
      lsp.listen();
    }
  }

  public async initialize(
    clientCapabilities: ClientCapabilities,
    workspaceFolders: [WorkspaceFolder]
  ): Promise<InitializeResult> {
    const allPromises: Array<Promise<InitializeResult>> = this.lsps.map(lsp =>
      lsp.initialize(clientCapabilities, workspaceFolders)
    );
    return Promise.all(allPromises).then(values => {
      // TODO: combile the values
      return values[0];
    });
  }

  public receiveRequest(method: string, params: any) {
    const allPromises: Array<Promise<{}>> = this.lsps.map(lsp =>
      lsp.receiveRequest(method, params)
    );

    return Promise.all(allPromises).then(values => {
      // TODO: combile the values
      return values[0];
    });
  }

  /** Lancuch a LSP proxy and register a proxy */
  public async launchTypescript() {
    const port = await getPort({ port: 20000 });

    this.log.info('Launch Typescript Language Server at port ' + port);
    // TODO move it to subprocess
    serve({
      clusterSize: 1,
      lspPort: port,
    });

    this.lsps.push(new LanguageServerProxy(port, this.targetHost, this.lspLogger));
  }
}
