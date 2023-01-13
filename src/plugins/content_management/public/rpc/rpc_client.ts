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
  GetDetailsIn,
  GetDetailsOut,
  GetPreviewIn,
  GetPreviewOut,
  CreateIn,
  CreateOut,
  SearchIn,
  SearchOut,
  Calls,
} from '../../common';

export class RpcClient {
  constructor(private http: { post: HttpSetup['post'] }) {}

  // --------------------
  // Public API
  // --------------------
  /** Get the preview of a content (Returns common schema) */
  public getPreview(input: GetPreviewIn): Promise<GetPreviewOut> {
    return this.sendMessage('getPreview', input);
  }

  /** Get a full content */
  public get<O extends GetDetailsOut, Options extends object | undefined = undefined>(
    input: GetDetailsIn<Options>
  ): Promise<O> {
    return this.sendMessage('get', input);
  }

  public create<
    I extends object,
    O extends CreateOut,
    Options extends object | undefined = undefined
  >(input: CreateIn<I, Options>): Promise<O> {
    return this.sendMessage('create', input);
  }

  public search(input: SearchIn = {}): Promise<SearchOut> {
    return this.sendMessage('search', input);
  }

  private sendMessage = async (name: Calls, input: any): Promise<any> => {
    const { result } = await this.http.post<{ result: any }>(`${API_ENDPOINT}/${name}`, {
      body: JSON.stringify(input),
    });
    return result;
  };
}
