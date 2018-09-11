/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { DidChangeWorkspaceFoldersParams } from 'vscode-languageserver-protocol';
import { LspRequest } from '../../model';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

interface Job {
  request: LspRequest;
  resolve: (response: ResponseMessage) => void;
  reject: (error: any) => void;
}

export class RequestExpander implements ILanguageServerHandler {
  private proxy: LanguageServerProxy;
  private jobQueue: Job[] = [];
  private workspaces: string[] = [];
  private initialized: boolean = false;

  constructor(proxy: LanguageServerProxy, readonly builtinWorkspace: boolean) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
    proxy.onDisconnected(() => {
      this.initialized = false;
      this.workspaces = [];
    });
  }

  public handleRequest(request: LspRequest): Promise<ResponseMessage> {
    return new Promise<ResponseMessage>((resolve, reject) => {
      this.jobQueue.push({
        request,
        resolve,
        reject,
      });
      this.handleNext();
    });
  }

  public workspaceChanged(request: LspRequest) {
    return !this.workspaces.includes(request.workspacePath!);
  }

  public async exit() {
    return this.proxy.exit();
  }

  private handle() {
    const job = this.jobQueue.shift();
    if (job) {
      const { request, resolve, reject } = job;
      this.expand(request).then(
        value => {
          try {
            resolve(value);
          } finally {
            this.handleNext();
          }
        },
        err => {
          try {
            reject(err);
          } finally {
            this.handleNext();
          }
        }
      );
    }
  }

  private handleNext() {
    setTimeout(this.handle, 0);
  }

  private async expand(request: LspRequest): Promise<ResponseMessage> {
    if (request.workspacePath) {
      if (!this.initialized) {
        this.workspaces = [request.workspacePath];
        await this.proxy.initialize({}, [
          {
            name: request.workspacePath,
            uri: `file://${request.workspacePath}`,
          },
        ]);
        this.initialized = true;
      } else {
        if (this.workspaceChanged(request)) {
          await this.changeWorkspaceFolders(request.workspacePath);
        }
      }
    }

    return await this.proxy.handleRequest(request);
  }

  private async changeWorkspaceFolders(workspacePath: string) {
    let params: DidChangeWorkspaceFoldersParams;
    // support multiple workspaces;
    if (this.builtinWorkspace) {
      this.workspaces.push(workspacePath);
      params = {
        event: {
          added: [
            {
              name: workspacePath!,
              uri: `file://${workspacePath}`,
            },
          ],
          removed: [],
        },
      };
    } else {
      params = {
        event: {
          added: [
            {
              name: workspacePath!,
              uri: `file://${workspacePath}`,
            },
          ],
          removed: [
            {
              name: this.workspaces[0],
              uri: `file://${this.workspaces[0]}`,
            },
          ],
        },
      };
      this.workspaces = [workspacePath];
    }
    return await this.proxy.handleRequest({
      method: 'workspace/didChangeWorkspaceFolders',
      params,
    });
  }
}
