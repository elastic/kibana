/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Hapi from 'hapi';

import { Log } from '../log';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

import { ChildProcess, spawn } from 'child_process';
import getPort from 'get-port';
import path from 'path';
// @ts-ignore
import signals from 'signal-exit/signals';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LspRequest } from '../../model';
import { RequestExpander } from './request_expander';

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController implements ILanguageServerHandler {
  /** Map from langauge type to Lsp Server Controller */
  private lsps: ILanguageServerHandler[] = [];
  private readonly targetHost: string;
  private log: Log;
  private readonly detach: boolean = false;
  private server: Hapi.Server;

  constructor(targetHost: string, server: Hapi.Server) {
    this.targetHost = targetHost;
    this.log = new Log(server);
    this.server = server;
  }

  public handleRequest(request: LspRequest) {
    const allPromises: Array<Promise<ResponseMessage>> = this.lsps.map(lsp =>
      lsp.handleRequest(request)
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
    const log = new Log(this.server, ['LSP', `ts@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);

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
    proxy.listen();
    this.lsps.push(new RequestExpander(proxy));
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
