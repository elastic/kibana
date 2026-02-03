/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export interface ClassConstructorWithStaticProperties {
  staticProperty1: string;
  new (config: { foo: string }): InterfaceWithIndexSignature;
}

export function plugin() {
  return new PluginA();
}

// Expected issues:
//   missing comments (9):
//     line 20 - imAnAny
//     line 21 - imAnUnknown
//     line 24 - InterfaceWithIndexSignature
//     line 25 - [key: string]: { foo: string; }
//     line 28 - ClassConstructorWithStaticProperties
//     line 29 - staticProperty1
//     line 30 - config
//     line 30 - foo
//     line 30 - new
//   any usage (1):
//     line 20 - imAnAny
//   no references (9):
//     line 20 - imAnAny
//     line 21 - imAnUnknown
//     line 24 - InterfaceWithIndexSignature
//     line 25 - [key: string]: { foo: string; }
//     line 28 - ClassConstructorWithStaticProperties
//     line 29 - staticProperty1
//     line 30 - config
//     line 30 - foo
//     line 30 - new
