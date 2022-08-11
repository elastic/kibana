/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, Type, TypeOf } from '@kbn/config-schema';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import * as trpc from '@trpc/server';
import type { PluginASetup } from './plugin';

const mySchema = schema.object({
  inputA: schema.string(),
  inputB: schema.maybe(schema.string()),
});

function toZodEsque<T extends Type<unknown> = Type<unknown>>(
  s: T
): { _input: TypeOf<T>; _output: TypeOf<T> } {
  return {
    _input: undefined as unknown as TypeOf<typeof s>,
    _output: undefined as unknown as TypeOf<typeof s>,
    ...s,
  };
}

export const rpc = trpc
  .router()
  .query('getSomething', {
    resolve: async () => ({
      okFromA: true,
    }),
  })
  // Expose your start contract over the RPC interface
  .query('somethingSpecialFromA' as keyof PluginASetup, {
    resolve: async () => getContract().somethingSpecialFromA(),
  })
  .mutation('updateSomething', {
    input: toZodEsque(mySchema),
    resolve: async () => {},
  });

export const [getContract, setContract] = createGetterSetter<PluginASetup>('pluginAContract');

export type PluginARPC = typeof rpc;
