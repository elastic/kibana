/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Type } from '@kbn/config-schema';
import { Calls } from '../../common';

interface CallConfig<Context> {
  fn: (ctx: Context, input: any) => Promise<any>;
  schemas: {
    in: Type<any>;
    out: Type<any>;
  };
}

interface Registry<Context> {
  [fnName: string]: CallConfig<Context>;
}

export class FunctionHandler<Context> {
  private registry: Registry<Context> = {};

  register(fnName: Calls, config: CallConfig<Context>) {
    this.registry[fnName] = config;
  }

  async call(
    context: Context,
    fnName: Calls,
    input: any
  ): Promise<{ token?: string; result?: any }> {
    // TODO: validate input

    const handler = this.registry[fnName];
    if (!handler) throw new Error(`Handler missing for ${fnName}`);

    const result = await handler.fn(context, input);

    // TODO: validate result

    return { result };
  }
}
