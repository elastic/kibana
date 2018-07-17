/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as net from 'net';
import {
  createMessageConnection,
  Logger,
  MessageConnection,
  SocketMessageReader,
  SocketMessageWriter,
} from 'vscode-jsonrpc';

import { RequestMessage } from 'vscode-jsonrpc/lib/messages';

import { createConnection, IConnection } from 'vscode-languageserver';
import {
  ClientCapabilities,
  InitializedNotification,
  InitializeResult,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol';

import { HttpMessageReader } from './HttpMessageReader';
import { HttpMessageWriter } from './HttpMessageWriter';
import { HttpRequestEmitter } from './HttpRequestEmitter';
import { createRepliesMap } from './RepliesMap';

export class LanguageServerProxy {
  public initialized: boolean = false;

  private conn: IConnection;
  private clientConnection: MessageConnection | null = null;

  private sequenceNumber = 0;
  private httpEmitter = new HttpRequestEmitter();
  private replies = createRepliesMap();
  private readonly targetHost?: string;
  private readonly targetPort: number;
  private readonly logger?: Logger;

  constructor(targetPort: number, targetHost?: string, logger?: Logger) {
    this.targetHost = targetHost;
    this.targetPort = targetPort;
    this.logger = logger;
    this.conn = createConnection(
      new HttpMessageReader(this.httpEmitter),
      new HttpMessageWriter(this.replies, logger)
    );
  }

  public receiveRequest(method: string, params: any) {
    const message: RequestMessage = {
      jsonrpc: '2.0',
      id: this.sequenceNumber++,
      method,
      params,
    };
    return new Promise((resolve, reject) => {
      if (this.logger) {
        this.logger.log(`emit message ${JSON.stringify(message)}`);
      }

      this.replies.set(message.id as number, [resolve, reject]);
      this.httpEmitter.emit('message', message);
    });
  }

  public connect(): Promise<MessageConnection> {
    if (this.clientConnection) {
      return Promise.resolve(this.clientConnection);
    }
    return new Promise(resolve => {
      const socket = net.connect(this.targetPort, this.targetHost);
      socket.on('connect', () => {
        const reader = new SocketMessageReader(socket);
        const writer = new SocketMessageWriter(socket);
        this.clientConnection = createMessageConnection(reader, writer, this.logger);
        this.clientConnection.listen();
        socket.on('end', () => {
          if (this.clientConnection) {
            this.clientConnection.dispose();
          }
          this.clientConnection = null;
        });
        resolve(this.clientConnection);
      });
    });
  }

  public async initialize(
    clientCapabilities: ClientCapabilities,
    workspaceFolders: [WorkspaceFolder]
  ): Promise<InitializeResult> {
    const clientConn = await this.connect();
    const rootUri = workspaceFolders[0].uri;
    const params = {
      processId: null,
      workspaceFolders,
      rootUri,
      capabilities: clientCapabilities,
    };

    return await clientConn.sendRequest('initialize', params).then(r => {
      clientConn.sendNotification(InitializedNotification.type, {});
      this.initialized = true;
      return r as InitializeResult;
    });
  }

  public listen() {
    this.conn.onRequest((method: string, ...params) => {
      if (this.logger) {
        this.logger.log('received rest request method: ' + method);
      }

      return this.connect().then(clientConn => {
        if (this.logger) {
          this.logger.log(`proxy method:${method} to client `);
        }

        return clientConn.sendRequest(method, ...params);
      });
    });
    this.conn.listen();
  }
}
