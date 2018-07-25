/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AbstractMessageReader,
  DataCallback,
  MessageReader,
} from 'vscode-jsonrpc/lib/messageReader';

import { HttpRequestEmitter } from './http_request_emitter';

export class HttpMessageReader extends AbstractMessageReader implements MessageReader {
  private httpEmitter: HttpRequestEmitter;

  public constructor(httpEmitter: HttpRequestEmitter) {
    super();
    httpEmitter.on('error', (error: any) => this.fireError(error));
    httpEmitter.on('close', () => this.fireClose());
    this.httpEmitter = httpEmitter;
  }

  public listen(callback: DataCallback): void {
    this.httpEmitter.on('message', callback);
  }
}
