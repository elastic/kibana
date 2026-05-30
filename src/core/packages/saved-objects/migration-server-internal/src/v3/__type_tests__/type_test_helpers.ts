/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** True when A and B are mutually assignable (type equality). */
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

/** Assert a compile-time boolean is true. */
export type Expect<T extends true> = T;

/** True when A is assignable to B. */
export type Extends<A, B> = A extends B ? true : false;

/** True when A is not assignable to B. */
export type NotExtends<A, B> = Extends<A, B> extends true ? false : true;

export {};
