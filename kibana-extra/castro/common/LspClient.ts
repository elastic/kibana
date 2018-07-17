/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError, ResponseErrorLiteral, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

export { TextDocumentMethods } from './TextDocumentMethods';

export interface LspClient {
  sendRequest(method: string, params: any): Promise<ResponseMessage>;
}

export class LspRestClient implements LspClient {
  private baseUri: string;
  private customHeaders: { [header: string]: string };

  constructor(baseUri: string, customHeaders: { [header: string]: string } = {}) {
    this.baseUri = baseUri;
    this.customHeaders = customHeaders;
  }

  public async sendRequest(method: string, params: any): Promise<ResponseMessage> {
    const headers = new Headers(this.customHeaders);
    headers.append('Content-Type', 'application/json');
    const response = await fetch(`${this.baseUri}/${method}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    if (response.ok) {
      return (await response.json()) as ResponseMessage;
    } else {
      const error = (await response.json()) as ResponseErrorLiteral<any>;
      throw new ResponseError<any>(error.code, error.message, error.data);
    }
  }
}
