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

import { ChildProcess, spawn } from 'child_process';
import getPort from 'get-port';
import path from 'path';
// @ts-ignore
import signals from 'signal-exit/signals';

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController {
  /** Map from langauge type to Lsp Server Controller */
  private lsps: LanguageServerProxy[] = [];
  private readonly targetHost: string;
  private readonly lspLogger?: Logger;
  private log: Log;
  private readonly detach: boolean = false;

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
    let port = 2089;

    if (!this.detach) {
      port = await getPort();
    }

    const proxy = new LanguageServerProxy(port, this.targetHost, this.lspLogger);

    if (!this.detach) {
      this.log.info('Launch Typescript Language Server at port ' + port);
      const child = spawn(
        'node',
        [
          path.resolve(
            __dirname,
            '../../../../lsp/javascript-typescript-langserver/lib/language-server'
          ),
          '-p',
          port.toString(),
          '-c',
          '1',
        ],
        {
          detached: true,
          stdio: 'inherit',
        }
      );
      this.closeOnExit(proxy, child);
    }

    this.lsps.push(proxy);
  }

  private async closeOnExit(proxy: LanguageServerProxy, child: ChildProcess) {
    let childTerminated = false;
    child.on('exit', () => (childTerminated = true));
    const listeners: { [signal: string]: () => void } = {};
    signals.forEach((signal: string) => {
      const listener = async () => {
        await proxy.exit();
        if (!childTerminated) {
          child.kill(signal);
          this.log.info(`sent ${signal} to language server, pid:${child.pid}`);
        }
        process.removeListener(signal, listeners[signal]);
        process.kill(process.pid, signal);
      };
      listeners[signal] = listener;
      process.on(signal, listener);
    });
    return proxy;
  }
}
