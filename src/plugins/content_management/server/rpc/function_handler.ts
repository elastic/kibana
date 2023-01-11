/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isLeft } from 'fp-ts/lib/These';

import { Payload } from '../../common';
import type { FN, NamedFnDef } from '../../common';

interface Registry<Context> {
  [key: string]: {
    fn: (ctx: Context, msg: any) => Promise<any>;
    type: FN<any, any>;
  };
}

type AsyncFnCall<C, I, O> = (ctx: C, msg: I) => Promise<O>;

type RegisterFunction<C> = <I, O>(type: NamedFnDef<I, O>) => (fn: AsyncFnCall<C, I, O>) => void;

export class FunctionHandler<Context> {
  private registry: Registry<Context> = {};

  load(loader: (register: RegisterFunction<Context>) => void) {
    loader((type) => (fn) => {
      this.registry[type.name] = { type: type(), fn };
    });
  }

  async call(context: Context, msg: any): Promise<{ token?: string; result?: any }> {
    const payload = Payload.decode(msg);

    if (isLeft(payload)) {
      throw new Error(`Payload error: ${payload}`);
    }

    const { fn, arg } = payload.right;
    const handler = this.registry[fn];
    if (!handler) throw new Error(`Handler missing for ${fn}`);

    const input = handler.type.i.decode(arg);
    if (isLeft(input)) throw new Error(`Invalid input for ${fn}: ${input}`);

    const result = await handler.fn(context, input.right);
    return { result };
  }
}
