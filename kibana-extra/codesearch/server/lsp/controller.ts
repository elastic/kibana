/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Hapi from 'hapi';
import { ErrorCodes, ResponseError } from 'vscode-jsonrpc';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LspRequest } from '../../model';
import { Log } from '../log';
import { ServerOptions } from '../server_options';
import { detectLanguage } from '../utils/detect_language';
import { JavaLauncher } from './java_launcher';
import { ILanguageServerLauncher } from './language_server_launcher';
import { ILanguageServerHandler } from './proxy';
import { TypescriptServerLauncher } from './ts_launcher';

interface WorkspaceHandlerMap {
  [workspaceUri: string]: ILanguageServerHandler;
}

interface LanguageServer {
  builtinWorkspaceFolders: boolean;
  maxWorkspace: number;
  languages: string[];
  launcher: ILanguageServerLauncher;
  workspaceHandlers?: ILanguageServerHandler | WorkspaceHandlerMap;
}

/**
 * Manage different LSP servers and forward request to different LSP using LanguageServerProxy, currently
 * we just use forward request to all the LSP servers we are running.
 */
export class LanguageServerController implements ILanguageServerHandler {
  // a list of support language servers
  private readonly languageServers: LanguageServer[];
  // a { lang -> server } map from above list
  private readonly languageServerMap: { [lang: string]: LanguageServer };
  private log: Log;
  private readonly detach: boolean = process.env.LSP_DETACH === 'true';

  constructor(
    readonly options: ServerOptions,
    readonly targetHost: string,
    readonly server: Hapi.Server
  ) {
    this.log = new Log(server);
    this.languageServers = [
      {
        builtinWorkspaceFolders: false,
        languages: ['typescript', 'javascript', 'html'],
        maxWorkspace: options.maxWorkspace,
        workspaceHandlers: {},
        launcher: new TypescriptServerLauncher(this.targetHost, this.detach, this.server),
      },
      {
        builtinWorkspaceFolders: true,
        languages: ['java'],
        maxWorkspace: options.maxWorkspace,
        launcher: new JavaLauncher(this.targetHost, this.detach, options.jdtWorkspacePath, this.server),
      },
    ];
    this.languageServerMap = this.languageServers.reduce(
      (map, ls) => {
        ls.languages.forEach(lang => (map[lang] = ls));
        return map;
      },
      {} as { [lang: string]: LanguageServer }
    );
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

  public async dispatchRequest(lang: string, request: LspRequest): Promise<ResponseMessage> {
    if (lang) {
      const languageServer = this.languageServerMap[lang];
      if (languageServer && languageServer.workspaceHandlers) {
        if (languageServer.builtinWorkspaceFolders) {
          const handler = languageServer.workspaceHandlers as ILanguageServerHandler;
          return handler.handleRequest(request);
        } else {
          const handler = await this.findOrCreateHandler(languageServer, request);
          handler.lastAccess = Date.now();
          return handler.handleRequest(request);
        }
      } else {
        return Promise.reject(
          new ResponseError(ErrorCodes.UnknownErrorCode, `unimplemented handler for ${lang}`)
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

  public async exit() {
    // Shouldn't be use here
  }

  public async launchServers() {
    for (const ls of this.languageServers) {
      // for those language server has builtin workspace support, we can launch them during kibana startup
      if (ls.builtinWorkspaceFolders) {
        try {
          ls.workspaceHandlers = await ls.launcher.launch(true, ls.maxWorkspace);
        } catch (e) {
          this.log.error(e);
        }
      }
    }
  }

  private async findOrCreateHandler(
    languageServer: LanguageServer,
    request: LspRequest
  ): Promise<ILanguageServerHandler> {
    const handlers = languageServer.workspaceHandlers as WorkspaceHandlerMap;
    if (!request.workspacePath) {
      throw new ResponseError(ErrorCodes.UnknownErrorCode, `no workspace in request?`);
    }
    let handler = handlers[request.workspacePath];
    if (handler) {
      return handler;
    } else {
      const maxWorkspace = languageServer.maxWorkspace;
      const handlerArray = Object.entries(handlers);
      if (handlerArray.length < maxWorkspace) {
        handler = await languageServer.launcher.launch(
          languageServer.builtinWorkspaceFolders,
          maxWorkspace
        );
        handlers[request.workspacePath!] = handler;
        return handler;
      } else {
        let [oldestWorkspace, oldestHandler] = handlerArray[0];
        handlerArray.forEach(p => {
          const [ws, h] = p;
          if (h.lastAccess! < oldestHandler.lastAccess!) {
            oldestWorkspace = ws;
            oldestHandler = h;
          }
        });
        delete handlers[oldestWorkspace];
        handlers[request.workspacePath] = oldestHandler;
        return oldestHandler;
      }
    }
  }
}
