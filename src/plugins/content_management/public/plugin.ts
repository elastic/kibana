/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import { RpcClient } from './rpc';

export class ContentManagementPlugin implements Plugin {
  private rpcClient: RpcClient | undefined;

  public setup(core: CoreSetup): void {
    this.rpcClient = new RpcClient({
      post: core.http.post,
    });
  }

  public start() {
    if (!this.rpcClient) {
      throw new Error('Rcp client has not been initialized');
    }

    const foo = async (rpc: RpcClient) => {
      await rpc.get('7777');
      // console.log('Result', res);
    };

    foo(this.rpcClient);

    return {
      rpc: this.rpcClient,
    };
  }
}
