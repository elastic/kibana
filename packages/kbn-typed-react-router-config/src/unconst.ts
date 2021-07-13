/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { DeepReadonly } from 'utility-types';

export type MaybeConst<TObject extends object | [object]> = TObject extends [object]
  ? [DeepReadonly<TObject> | TObject]
  : TObject extends [object, ...infer TTail]
  ? [DeepReadonly<TObject> | TObject, ...(TTail extends object[] ? MaybeConst<TTail> : [])]
  : TObject extends object[]
  ? DeepReadonly<TObject>
  : TObject extends object
  ? [DeepReadonly<TObject> | TObject]
  : [];

export type Unconst<T> = T extends React.ReactElement
  ? React.ReactElement<any, any>
  : T extends t.Type<any>
  ? T
  : T extends readonly [any]
  ? [Unconst<T[0]>]
  : T extends readonly [any, any]
  ? [Unconst<T[0]>, Unconst<T[1]>]
  : T extends readonly [any, any, any]
  ? [Unconst<T[0]>, Unconst<T[1]>, Unconst<T[2]>]
  : T extends readonly [any, any, any, any]
  ? [Unconst<T[0]>, Unconst<T[1]>, Unconst<T[2]>, Unconst<T[3]>]
  : T extends readonly [any, any, any, any, any]
  ? [Unconst<T[0]>, Unconst<T[1]>, Unconst<T[2]>, Unconst<T[3]>, Unconst<T[4]>]
  : T extends readonly [any, any, any, any, any, any]
  ? [Unconst<T[0]>, Unconst<T[1]>, Unconst<T[2]>, Unconst<T[3]>, Unconst<T[4]>, Unconst<T[5]>]
  : T extends readonly [any, any, any, any, any, any, any]
  ? [
      Unconst<T[0]>,
      Unconst<T[1]>,
      Unconst<T[2]>,
      Unconst<T[3]>,
      Unconst<T[4]>,
      Unconst<T[5]>,
      Unconst<T[6]>
    ]
  : T extends readonly [any, any, any, any, any, any, any, any]
  ? [
      Unconst<T[0]>,
      Unconst<T[1]>,
      Unconst<T[2]>,
      Unconst<T[3]>,
      Unconst<T[4]>,
      Unconst<T[5]>,
      Unconst<T[6]>,
      Unconst<T[7]>
    ]
  : T extends readonly [any, any, any, any, any, any, any, any, any]
  ? [
      Unconst<T[0]>,
      Unconst<T[1]>,
      Unconst<T[2]>,
      Unconst<T[3]>,
      Unconst<T[4]>,
      Unconst<T[5]>,
      Unconst<T[6]>,
      Unconst<T[7]>,
      Unconst<T[8]>
    ]
  : T extends readonly [any, any, any, any, any, any, any, any, any, any]
  ? [
      Unconst<T[0]>,
      Unconst<T[1]>,
      Unconst<T[2]>,
      Unconst<T[3]>,
      Unconst<T[4]>,
      Unconst<T[5]>,
      Unconst<T[6]>,
      Unconst<T[7]>,
      Unconst<T[8]>,
      Unconst<T[9]>
    ]
  : T extends readonly [infer U, ...infer V]
  ? [Unconst<U>, ...Unconst<V>]
  : T extends Record<any, any>
  ? { -readonly [key in keyof T]: Unconst<T[key]> }
  : T;

export function unconst<T>(value: T): Unconst<T> {
  return value as Unconst<T>;
}
