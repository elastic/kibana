/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';

type Unconst<T> = T extends React.ReactElement
  ? T
  : T extends t.Type<any>
  ? T
  : T extends readonly [infer U]
  ? [Unconst<U>]
  : T extends readonly [infer U, ...infer V]
  ? [Unconst<U>, ...Unconst<V>]
  : T extends Record<any, any>
  ? { -readonly [key in keyof T]: Unconst<T[key]> }
  : T;

export function unconst<T>(value: T): Unconst<T> {
  return value as Unconst<T>;
}
