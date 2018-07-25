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
  private proxy: LanguageServerProxy;
  private jobQueue: Job[] = [];
  constructor(proxy: LanguageServerProxy) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
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
      await this.proxy.initialize({}, [
        {
          name: request.workspacePath,
          uri: `file://${request.workspacePath}`,
        },
      ]);
    }
    const response = await this.proxy.handleRequest(request);
    await this.proxy.shutdown();
    return response;
  }
}
