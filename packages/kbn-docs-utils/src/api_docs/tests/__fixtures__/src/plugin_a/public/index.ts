/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginA, Setup, Start, SearchSpec } from './plugin';
export { Setup, Start, SearchSpec };

export { doTheFooFnThing, FooType } from './foo';

export * from './fns';
export * from './classes';
export * from './const_vars';
export * from './types';

export const imAnAny: any = 'hi';
export const imAnUnknown: unknown = 'hi';

// This kind of type was triggering an `any` type even though it has no anys!
export interface InterfaceWithIndexSignature {
  [key: string]: { foo: string };
}

export function plugin() {
  return new PluginA();
}
