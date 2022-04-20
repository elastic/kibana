/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-restricted-syntax */

export type { Bar as ReexportedClass } from './bar';

export const someConst = 'bar';

// eslint-disable-next-line prefer-const
export let someLet = 'bar';

export function someFunction() {}

export class SomeClass {}

export interface SomeInterface {
  prop: number;
}

export enum SomeEnum {
  a = 'a',
  b = 'b',
}

export type TypeAlias = string[];
