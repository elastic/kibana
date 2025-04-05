/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MaybePromise } from '@kbn/utility-types';

export const kSerialize = Symbol('transferable.serialize');
export const kDeserialize = Symbol('transferable.deserialize');

type Primitive = number | string | boolean | null | undefined;

export interface ValidTransferable<
  T extends Record<string, any> & {
    _as?: string;
  }
> {
  [kSerialize]?(): MaybePromise<T>;
}

interface InvalidTransferable<T> {
  [kSerialize](): never;
}

type IsAny<T> = boolean extends (T extends never ? true : false) ? true : false;

type IsSerializableRecord<T extends Partial<Record<string, any>>> = Exclude<
  {
    [key in keyof T]: IsSerializable<T[key]>;
  }[keyof T],
  undefined
>;

type IsSerializable<T> = IsAny<T> extends true
  ? true
  : T extends Primitive
  ? true
  : T extends Transferable<any>
  ? true
  : T extends any[] | readonly any[]
  ? IsSerializable<T[number]>
  : T extends (...args: any[]) => any
  ? false
  : T extends Partial<Record<string, any>>
  ? IsSerializableRecord<T> extends true
    ? true
    : false
  : false;

export type ExtractTransferableState<T> = T extends any[] | readonly any[]
  ? Array<ExtractTransferableState<T[number]>>
  : T extends Partial<Record<string, any>>
  ? {
      [key in keyof T]: T[key] extends Required<ValidTransferable<any>>
        ? TransferableStateOf<T[key]>
        : ExtractTransferableState<T[key]>;
    }
  : T;

export type TransferableStateOf<T extends ValidTransferable<any>> = T extends ValidTransferable<
  infer U
>
  ? ExtractTransferableState<U>
  : never;

export type Transferable<T extends Record<string, any>> = IsSerializable<T> extends true
  ? ValidTransferable<T>
  : InvalidTransferable<T>;

export interface TransferableConstructor<T> {
  [kDeserialize](data: unknown): T;
}
