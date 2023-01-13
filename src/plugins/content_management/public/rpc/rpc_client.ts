/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core/public';

import { API_ENDPOINT, Calls, Payload } from '../../common';
import type { AsyncFN, NamedFnDef } from '../../common';

export class RpcClient {
  constructor(private http: { post: HttpSetup['post'] }) {}

  // --------------------
  // Public API
  // --------------------
  // Get a KibanaContent (common schema). Usefull for preview
  public getPreview({ type, id }: { type: string; id: string }) {
    return this.realize(Calls.getPreview)({ type, id });
  }

  // Get a full content details from its storage layer (Schema is unknown)
  public get({ type, id }: { type: string; id: string }) {
    return this.realize(Calls.get)({ type, id });
  }

  // TODO: improve typings
  public create({ type, data }: { type: string; data: any }) {
    return this.realize(Calls.create)({ type, data });
  }

  public search({ type, term }: { term?: string; type?: string }) {
    return this.realize(Calls.search)({ type, term });
  }

  private sendMessage = async <I, O>(name: string, input: I): Promise<O> => {
    const payload = Payload.encode({ fn: name, arg: input });
    const { result } = await this.http.post<{ result: O }>(API_ENDPOINT, {
      body: JSON.stringify(payload),
    });
    return result;
  };

  private realize<I, O>(decl: NamedFnDef<I, O>): AsyncFN<I, O> {
    return async (input) => await this.sendMessage(decl.name, input);
  }
}
