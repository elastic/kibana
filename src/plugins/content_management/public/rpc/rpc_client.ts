/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';

import { API_ENDPOINT } from '../../common';
import type { GetIn, CreateIn, ProcedureName } from '../../common';

export class RpcClient {
  constructor(private http: { post: HttpSetup['post'] }) {}

  // --------------------
  // Public API
  // --------------------
  /** Get a single content */
  public async get<I extends GetIn = GetIn, O = any>(
    input: I,
    // Temporay mechanism to register hooks
    // This will have to be declared on the client side registry
    hooks?: { post?: (input: any) => any }
  ): Promise<O> {
    const result = await this.sendMessage('get', input);
    return hooks?.post ? hooks.post(result) : result;
  }

  public create<I extends CreateIn, O = any>(input: I): Promise<O> {
    return this.sendMessage('create', input);
  }

  private sendMessage = async (name: ProcedureName, input: any): Promise<any> => {
    const { result } = await this.http.post<{ result: any }>(`${API_ENDPOINT}/${name}`, {
      body: JSON.stringify(input),
    });
    return result;
  };
}
