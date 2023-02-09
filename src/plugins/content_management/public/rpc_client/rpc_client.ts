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

  public get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('get', input);
  }

  public create<I extends CreateIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('create', input);
  }

  private sendMessage = async (name: ProcedureName, input: any): Promise<any> => {
    const { result } = await this.http.post<{ result: any }>(`${API_ENDPOINT}/${name}`, {
      body: JSON.stringify(input),
    });
    return result;
  };
}
