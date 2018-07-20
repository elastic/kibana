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

import { RequestMessage, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import {
  ClientCapabilities,
  ExitNotification,
  InitializedNotification,
  InitializeResult,
  WorkspaceFolder,
} from 'vscode-languageserver-protocol/lib/main';
import { createConnection, IConnection } from 'vscode-languageserver/lib/main';

import { HttpMessageReader } from './HttpMessageReader';
import { HttpMessageWriter } from './HttpMessageWriter';
import { HttpRequestEmitter } from './HttpRequestEmitter';
import { createRepliesMap } from './RepliesMap';

export class LanguageServerProxy {
  public initialized: boolean = false;

  private conn: IConnection;
  private clientConnection: MessageConnection | null = null;
  private closed: boolean = false;
  private sequenceNumber = 0;
  private httpEmitter = new HttpRequestEmitter();
  private replies = createRepliesMap();
  private readonly targetHost: string;
  private readonly targetPort: number;
  private readonly logger?: Logger;

  constructor(targetPort: number, targetHost: string, logger?: Logger) {
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
    return new Promise<ResponseMessage>((resolve, reject) => {
      if (this.logger) {
        this.logger.log(`emit message ${JSON.stringify(message)}`);
      }

      this.replies.set(message.id as number, [resolve, reject]);
      this.httpEmitter.emit('message', message);
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

  /**
   * send a exit request to Language Server
   * https://microsoft.github.io/language-server-protocol/specification#exit
   */
  public async exit() {
    if (this.clientConnection) {
      if (this.logger) {
        this.logger.info('sending `shutdown` request to language server.');
      }
      const clientConn = this.clientConnection;
      await clientConn.sendRequest('shutdown').then(() => {
        if (this.logger) {
          this.logger.info('sending `exit` notification to language server.');
        }
        clientConn.sendNotification(ExitNotification.type);
        this.conn.dispose(); // stop listening
      });
    }
    this.closed = true; // stop the socket reconnect
  }

  private connect(): Promise<MessageConnection> {
    if (this.clientConnection) {
      return Promise.resolve(this.clientConnection);
    }
    this.closed = false;
    return new Promise(resolve => {
      const socket = new net.Socket();

      socket.on('connect', () => {
        const reader = new SocketMessageReader(socket);
        const writer = new SocketMessageWriter(socket);
        this.clientConnection = createMessageConnection(reader, writer, this.logger);
        this.clientConnection.listen();
        resolve(this.clientConnection);
      });

      socket.on('end', () => {
        if (this.clientConnection) {
          this.clientConnection.dispose();
        }
        this.clientConnection = null;
      });

      socket.on('close', () => {
        if (!this.closed) {
          // Reconnect after 1 second
          setTimeout(() => socket.connect(this.targetPort, this.targetHost), 1000);
        }
      });

      socket.on('error', () => void 0);
      socket.on('timeout', () => void 0);
      socket.on('drain', () => void 0);

      socket.connect(this.targetPort, this.targetHost);
    });
  }
}
