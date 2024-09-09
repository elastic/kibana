/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DeepPartial, ValuesType } from 'utility-types';
import { UnionToIntersection } from '..';

type DedotKey<
  TObject extends Record<string, any>,
  TKey extends keyof TObject,
  TValue
> = TKey extends `${infer THead}.${infer TTail}`
  ? {
      [key in THead]: DedotKey<TObject, TTail, TValue>;
    }
  : { [key in TKey]: TValue };

export type DedotObject<TObject extends Record<string, any>> = UnionToIntersection<
  Exclude<
    ValuesType<{
      [TKey in keyof TObject]: {} extends Pick<TObject, TKey>
        ? DeepPartial<DedotKey<TObject, TKey, Exclude<TObject[TKey], undefined>>>
        : DedotKey<TObject, TKey, TObject[TKey]>;
    }>,
    undefined
  >
>;

type ToArray<TObject> = TObject extends Record<string, any>
  ? {
      [TKey in keyof TObject]: Array<TObject[TKey]>;
    }
  : never;

type DotKey<
  TObject extends Record<string, any>,
  TKey extends keyof TObject & string,
  TPrefix extends string
> = TObject[TKey] extends Array<infer TValueType>
  ? TValueType extends Record<string, any>
    ? ToArray<DotObject<TValueType, `${TPrefix}${TKey}.`>>
    : never
  : TObject[TKey] extends Record<string, any>
  ? DotObject<TObject[TKey], `${TPrefix}${TKey}.`>
  : { [key in `${TPrefix}${TKey}`]: TObject[TKey] };

type _DotObject<TObject extends Record<string, any>, TPrefix extends string = ''> = ValuesType<{
  [TKey in keyof TObject & string]: {} extends Pick<TObject, TKey>
    ? Partial<DotKey<Required<TObject>, TKey, TPrefix>>
    : DotKey<TObject, TKey, TPrefix>;
}>;

export type DotObject<
  TObject extends Record<string, any>,
  TPrefix extends string = ''
> = UnionToIntersection<_DotObject<TObject, TPrefix>>;

export type DotKeysOf<TObject extends Record<string, any>> = keyof DotObject<TObject>;

export type PickDotted<
  TObject extends Record<string, any>,
  TPickKey extends DotKeysOf<TObject>
> = DedotObject<Pick<DotObject<TObject>, TPickKey>>;
