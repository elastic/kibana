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
  // a map for workspacePath -> lastAccess
  private workspaces: Map<string, number> = new Map();
  private initialized: boolean = false;

  constructor(
    proxy: LanguageServerProxy,
    readonly builtinWorkspace: boolean,
    readonly maxWorkspace: number
  ) {
    this.proxy = proxy;
    this.handle = this.handle.bind(this);
    proxy.onDisconnected(() => {
      this.initialized = false;
      this.workspaces.clear();
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
      if (this.initialized) {
        // already opened this workspace
        if (this.workspaces.has(request.workspacePath)) {
          // update last access timestamp
          this.workspaces.set(request.workspacePath, Date.now());
        } else {
          if (this.builtinWorkspace) {
            await this.changeWorkspaceFolders(request.workspacePath, this.maxWorkspace);
          } else {
            await this.proxy.shutdown();
            this.workspaces.clear();
            await this.initialize(request.workspacePath);
          }
        }
      } else {
        await this.initialize(request.workspacePath);
      }
    }
    return await this.proxy.handleRequest(request);
  }

  private async initialize(workspacePath: string) {
    this.workspaces.set(workspacePath, Date.now());
    await this.proxy.initialize({}, [
      {
        name: workspacePath,
        uri: `file://${workspacePath}`,
      },
    ]);
    this.initialized = true;
  }

  /**
   * use DidChangeWorkspaceFolders notification add a new workspace fold
   * replace the oldest one if count > maxWorkspace
   * builtinWorkspace = false is equal to maxWorkspace =1
   * @param workspacePath
   * @param maxWorkspace
   */
  private async changeWorkspaceFolders(workspacePath: string, maxWorkspace: number) {
    let params: DidChangeWorkspaceFoldersParams;
    this.workspaces.set(workspacePath, Date.now());
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

    if (this.workspaces.size >= this.maxWorkspace) {
      let oldestWorkspace;
      let oldestAccess = Number.MAX_VALUE;
      for (const [workspace, lastAccess] of this.workspaces) {
        if (lastAccess < oldestAccess) {
          oldestAccess = lastAccess;
          oldestWorkspace = workspace;
        }
      }
      if (oldestWorkspace) {
        params.event.removed.push({
          name: oldestWorkspace,
          uri: `file://${oldestWorkspace}`,
        });
        this.workspaces.delete(oldestWorkspace);
      }
    }
    return await this.proxy.handleRequest({
      method: 'workspace/didChangeWorkspaceFolders',
      params,
      isNotification: true,
    });
  }
}
