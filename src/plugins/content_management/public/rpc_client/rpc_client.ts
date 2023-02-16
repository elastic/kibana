/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';
import { API_ENDPOINT } from '../../common';
import type {
  GetIn,
  CreateIn,
  UpdateIn,
  DeleteIn,
  SearchIn,
  SearchOut,
  ProcedureName,
} from '../../common';
import type { CrudClient } from '../crud_client/crud_client';

export class RpcClient implements CrudClient {
  constructor(private http: { post: HttpSetup['post'] }) {}

  public get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('get', input);
  }

  public create<I extends CreateIn = CreateIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('create', input);
  }

  public update<I extends UpdateIn = UpdateIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('update', input);
  }

  public delete<I extends DeleteIn = DeleteIn, O = unknown>(input: I): Promise<O> {
    return this.sendMessage('delete', input);
  }

  public search<I extends SearchIn = SearchIn, O extends SearchOut = SearchOut>(
    input: I
  ): Promise<O> {
    return this.sendMessage('search', input);
  }

  private sendMessage = async (name: ProcedureName, input: any): Promise<any> => {
    const { result } = await this.http.post<{ result: any }>(`${API_ENDPOINT}/${name}`, {
      body: JSON.stringify(input),
    });
    return result;
  };
}
