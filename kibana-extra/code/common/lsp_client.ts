/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResponseError, ResponseMessage } from 'vscode-jsonrpc/lib/messages';

export { TextDocumentMethods } from './text_document_methods';
import { kfetch } from 'ui/kfetch';

export interface LspClient {
  sendRequest(method: string, params: any, singal?: AbortSignal): Promise<ResponseMessage>;
}

export class LspRestClient implements LspClient {
  private baseUri: string;

  constructor(baseUri: string) {
    this.baseUri = baseUri;
  }

  public async sendRequest(
    method: string,
    params: any,
    signal?: AbortSignal
  ): Promise<ResponseMessage> {
    try {
      const response = await kfetch({
        pathname: `${this.baseUri}/${method}`,
        method: 'POST',
        body: JSON.stringify(params),
        signal,
      });
      return response as ResponseMessage;
    } catch (e) {
      let error = e;
      if (error.body && error.body.error) {
        error = error.body.error;
      }
      throw new ResponseError<any>(error.code, error.message, error.data);
    }
  }
}
