/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LspClient } from './LspClient';

export class LspMethod<INPUT, OUTPUT> {
  private client: LspClient;
  private method: string;

  constructor(method: string, client: LspClient) {
    this.client = client;
    this.method = method;
  }

  public async send(input: INPUT): Promise<OUTPUT> {
    return await this.client
      .sendRequest(this.method, input)
      .then(result => result.result as OUTPUT);
  }
}
