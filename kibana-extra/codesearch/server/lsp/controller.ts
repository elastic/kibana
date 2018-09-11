/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as glob from 'glob';
import * as Hapi from 'hapi';

import { platform as getOsPlatform } from 'os';
import { Log } from '../log';
import { detectLanguage } from '../utils/detect_language';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

import { spawn } from 'child_process';
import getPort from 'get-port';

import path from 'path';
import { ErrorCodes, ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { DidChangeWorkspaceFoldersParams } from 'vscode-languageserver';
import { LspRequest } from '../../model';
import { RequestExpander } from './request_expander';

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController implements ILanguageServerHandler {
  /** Map from language type to Lsp Server Controller */
  private readonly builtinWorkspaceFolders: { [name: string]: boolean } = {
    typescript: true,
    java: true,
  }; // TODO flip typescript: false one multiple workspace is implemented
  private readonly serverLangMap: { [name: string]: string[] } = {
    typescript: ['typescript', 'javascript', 'html'],
    java: ['java'],
  };

  // Use languageServers[lang][workspace] to get a handler, If a server has builtin support multi workspace support
  // juse use '*' to get handler for all workspace
  private languageServers: { [name: string]: { [name: string]: ILanguageServerHandler } } = {};
  private readonly targetHost: string;
  private log: Log;
  private readonly detach: boolean = process.env.LSP_DETACH === 'true';
  private readonly server: Hapi.Server;

  constructor(targetHost: string, server: Hapi.Server) {
    this.targetHost = targetHost;
    this.log = new Log(server);
    this.server = server;
  }

  public async handleRequest(request: LspRequest) {
    const file = request.resolvedFilePath;
    if (file) {
      // #todo add test for this
      const lang = await detectLanguage(file.replace('file://', ''));
      return this.dispatchRequest(lang, request);
    } else {
      return Promise.reject(
        new ResponseError(ErrorCodes.UnknownErrorCode, `can't detect language without a file`)
      );
    }
  }

  public dispatchRequest(lang: string, request: LspRequest): Promise<ResponseMessage> {
    if (lang) {
      if (this.builtinWorkspaceFolders[lang]) {
        const handler = this.languageServers[lang.toLowerCase()]['*'];
        if (handler) {
          return handler.handleRequest(request);
        } else {
          return Promise.reject(
            new ResponseError(ErrorCodes.UnknownErrorCode, `no server found for language ${lang}`)
          );
        }
      } else {
        const serversMap = this.languageServers[lang.toLowerCase()];

        if (request.method === 'workspace/didChangeWorkspaceFolders') {
          const param: DidChangeWorkspaceFoldersParams = request.params;

          const removePromises: Array<Promise<any>> = param.event.removed.map(workspace => {
            const handler = serversMap[workspace.uri];

            for (const supportLang of this.serverLangMap[lang.toLowerCase()]) {
              const supportLangServers = this.languageServers[supportLang];
              delete supportLangServers[workspace.uri];
            }

            return handler.exit();
          });

          const addPromises: Array<Promise<any>> = param.event.added.map(workspace => {
            return this.launchServer(lang).then(server => {
              for (const supportLang of this.serverLangMap[lang.toLowerCase()]) {
                this.languageServers[supportLang][workspace.uri] = server;
              }
            });
          });

          // TODO check this
          const dummyResponse: ResponseMessage = { id: -1, jsonrpc: request.method };
          return Promise.all(removePromises.concat(addPromises)).then(
            () => dummyResponse,
            () => dummyResponse
          );
        } else {
          const workspace = ''; // TODO extract workspace from request

          let handler = null;
          // TODO check if this loop is correct in typescript
          for (const ws in serversMap) {
            // Find a handler that can handle this workspace
            if (ws === workspace) {
              handler = serversMap[ws];
            }
          }

          if (handler) {
            return handler.handleRequest(request);
          }
          return Promise.reject(
            new ResponseError(ErrorCodes.UnknownErrorCode, `unimplemented handler for ${lang}`)
          );
        }
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

  public async exit() {
    // Shouldn't be use here
  }

  /** Lancuch a LSP proxy and register a proxy */
  public async launchTypescript() {
    let port = 2089;

    if (!this.detach) {
      port = await getPort();
    }
    const log = new Log(this.server, ['LSP', `ts@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);

    if (this.detach) {
      log.info('Detach mode, expected LSP launch externally');
    } else {
      const spawnTs = () =>
        spawn(
          'node',
          [
            '--max_old_space_size=4096',
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
            detached: false,
            stdio: 'inherit',
          }
        );
      let child = spawnTs();
      log.info(`Launch Typescript Language Server at port ${port}, pid:${child.pid}`);
      proxy.onDisconnected(() => {
        child.kill();
        child = spawnTs();
      });
    }
    proxy.onDisconnected(() => {
      if (!proxy.isClosed) {
        log.warn('language server disconnected, reconnecting');
        setTimeout(() => proxy.connect(), 1000);
      }
    });
    proxy.listen();
    const handler = new RequestExpander(proxy);
    this.registerServer(['typescript', 'javascript', 'html'], handler);
    return handler;
  }

  public async launchServer(lang: string): Promise<ILanguageServerHandler> {
    switch (lang) {
      case 'typescript':
        return this.launchTypescript();
      case 'java':
        return this.launchJava();
      default:
        return Promise.reject(`Can't launch server for ${lang}`);
    }
  }

  public async launchJava() {
    let port = 2090;

    if (!this.detach) {
      port = await getPort();
    }
    const log = new Log(this.server, ['LSP', `java@${this.targetHost}:${port}`]);
    const proxy = new LanguageServerProxy(port, this.targetHost, log);
    proxy.awaitServerConnection();
    const javaLangserverPath = path.resolve(
      __dirname,
      '../../../../lsp/eclipse.jdt.ls/org.elastic.jdt.ls.product/target/repository'
    );
    const launchersFound = glob.sync('**/plugins/org.eclipse.equinox.launcher_*.jar', {
      cwd: javaLangserverPath,
    });
    if (!launchersFound.length) {
      this.log.error('cannot find executable jar for JavaLsp');
    }

    let config = './config_mac/';
    // detect platform
    switch (getOsPlatform()) {
      case 'darwin':
        break;
      case 'win32':
        config = './config_win/';
      case 'linux':
        config = './config_linux/';
      default:
        this.log.error('Unable to find platform for this os');
    }

    if (!this.detach) {
      const spawnJava = () => {
        return spawn(
          'java',
          [
            '-Declipse.application=org.elastic.jdt.ls.core.id1',
            '-Dosgi.bundles.defaultStartLevel=4',
            '-Declipse.product=org.elastic.jdt.ls.core.product',
            '-Dlog.level=ALL',
            '-noverify',
            '-Xmx1G',
            '-jar',
            path.resolve(javaLangserverPath, launchersFound[0]),
            '-configuration',
            path.resolve(javaLangserverPath, config),
            '-data',
            '/tmp/data',
          ],
          {
            detached: false,
            stdio: 'inherit',
            env: { CLIENT_PORT: port.toString() },
          }
        );
      };
      let child = spawnJava();
      log.info(`Launch Java Language Server at port ${port}, pid:${child.pid}`);
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          child.kill();
          proxy.awaitServerConnection();
          log.warn('language server disconnected, restarting it');
          child = spawnJava();
        }
      });
    } else {
      proxy.onDisconnected(() => {
        if (!proxy.isClosed) {
          proxy.awaitServerConnection();
        }
      });
    }
    proxy.listen();
    const handler = new RequestExpander(proxy);
    this.registerServer(this.serverLangMap.java, handler);
    return handler;
  }

  private registerServer(languages: string[], handler: RequestExpander) {
    for (const language of languages) {
      if (this.builtinWorkspaceFolders[language]) {
        this.languageServers[language.toLowerCase()]['*'] = handler;
      }
    }
  }
}
