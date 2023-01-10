/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';

import { API_ENDPOINT, Calls, Payload } from '../../common';
import type { AsyncFN, NamedFnDef } from '../../common';

export class RpcClient {
  constructor(private http: { post: HttpSetup['post'] }) {}

  // --------------------
  // Public API
  // --------------------
  public get(id: string) {
    return this.realize(Calls.get)(id);
  }

  private sendMessage = <I, O>(name: string, input: I): Promise<O> => {
    const payload = Payload.encode([name, input]);
    return this.http.post(API_ENDPOINT, { body: JSON.stringify(payload) });
  };

  private realize<I, O>(decl: NamedFnDef<I, O>): AsyncFN<I, O> {
    return async (input) => await this.sendMessage(decl.name, input);
  }
}
