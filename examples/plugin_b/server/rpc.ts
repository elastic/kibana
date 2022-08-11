/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { schema } from '@kbn/config-schema';
import * as trpc from '@trpc/server';
import type { PluginARPC } from '../../plugin_a/common';

export const rpc = trpc.router().query('getSomethingFromB', {
  resolve: async () => ({
    okFromB: true,
  }),
});

type Unwrap<T> = T extends trpc.Router<any, any, infer U, infer Y, any, any> ? [U, Y] : T;

type Merge<R1 extends trpc.AnyRouter, R2 extends trpc.AnyRouter> = trpc.Router<
  any,
  any,
  Unwrap<R1>[0] & Unwrap<R2>[0],
  Unwrap<R1>[1] & Unwrap<R2>[1],
  any,
  any
>;

export type PluginBRPC = Merge<typeof rpc, PluginARPC>;
