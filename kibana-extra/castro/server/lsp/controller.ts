/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Hapi from 'hapi';

import { Log } from '../log';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import getPort from 'get-port';
// @ts-ignore
import * as detect from 'language-detect';
import path from 'path';
// @ts-ignore
import signals from 'signal-exit/signals';
import { ErrorCodes, ResponseError } from 'vscode-jsonrpc';
import { LspRequest } from '../../model';
import { RequestExpander } from './request_expander';

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController implements ILanguageServerHandler {
  /** Map from langauge type to Lsp Server Controller */
  private languageServers: { [name: string]: ILanguageServerHandler } = {};
  private readonly targetHost: string;
  private log: Log;
  private readonly detach: boolean = false;
  private readonly server: Hapi.Server;

  constructor(targetHost: string, server: Hapi.Server) {
    this.targetHost = targetHost;
    this.log = new Log(server);
    this.server = server;
  }

  public handleRequest(request: LspRequest) {
    const file = request.resolvedFilePath;
    if (file) {
      // #todo add test for this
      // try  file name first, without read contents
      let lang = detect.filename(file);
      if (!lang) {
        // try again with file contents;
        lang = detect.contents(file, fs.readFileSync(file, 'utf8'));
      }
      return this.dispatchRequest(lang, request);
    } else {
      return Promise.reject(
        new ResponseError(ErrorCodes.UnknownErrorCode, `can't detect language without a file`)
      );
    }
  }
  public dispatchRequest(lang: string, request: LspRequest) {
    if (lang) {
      const handler = this.languageServers[lang.toLowerCase()];
      if (handler) {
        return handler.handleRequest(request);
      } else {
        return Promise.reject(
          new ResponseError(ErrorCodes.UnknownErrorCode, `no server found for language ${lang}`)
        );
      }
    } else {
      return Promise.reject(
        new ResponseError(
          ErrorCodes.UnknownErrorCode,
          `can't detect language from file:${request.resolvedFilePath}`
        )
      );
    }
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
    const handler = new RequestExpander(proxy);
    this.registerServer(['typescript', 'javascript', 'html'], handler);
  }

  private closeOnExit(proxy: LanguageServerProxy, child: ChildProcess) {
    let childTerminated = false;
    child.on('exit', () => (childTerminated = true));
    const listeners: { [signal: string]: () => void } = {};
    signals.forEach((signal: NodeJS.Signals) => {
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
  }

  private registerServer(languages: string[], handler: RequestExpander) {
    for (const language of languages) {
      this.languageServers[language.toLowerCase()] = handler;
    }
  }
}
