/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LspRequest } from '../../model';
import { ILanguageServerHandler, LanguageServerProxy } from './proxy';

interface Job {
  request: LspRequest;
  resolve: (response: ResponseMessage) => void;
  reject: (error: any) => void;
}

export class RequestExpander implements ILanguageServerHandler {
  public get initialized() {
    return this.currentWorkspace !== null;
  }

  private proxy: LanguageServerProxy;
  private jobQueue: Job[] = [];
  private currentWorkspace: { workspacePath: string; workspaceRevision: string } | null = null;

  constructor(proxy: LanguageServerProxy) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
    proxy.onDisconnected(() => {
      this.currentWorkspace = null;
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
    if (!this.initialized) {
      return true;
    }
    return (
      request.workspacePath !== this.currentWorkspace!.workspacePath ||
      request.workspaceRevision !== this.currentWorkspace!.workspaceRevision
    );
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
      if (this.workspaceChanged(request)) {
        if (this.initialized) {
          await this.proxy.shutdown();
        }
        await this.proxy.initialize({}, [
          {
            name: request.workspacePath,
            uri: `file://${request.workspacePath}`,
          },
        ]);
        this.currentWorkspace = {
          workspacePath: request.workspacePath,
          workspaceRevision: request.workspaceRevision || 'HEAD',
        };
      }
    }

    return await this.proxy.handleRequest(request);
  }
}
