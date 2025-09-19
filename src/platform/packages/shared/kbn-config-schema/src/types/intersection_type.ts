/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IsAny, Simplify } from './helper_types';
import type {
  Props,
  ObjectTypeOptions,
  ObjectProps,
  ObjectDefaultValue,
  ObjectResultType,
  ObjectResultDefaults,
} from './object_type';
import { ObjectType } from './object_type';

export type IntersectionTypeOptions<
  P extends ObjectProps<Props>,
  D extends ObjectDefaultValue<any>
> = ObjectTypeOptions<P, D>;

export type IntersectionBaseType<P extends ObjectProps<Props>, D extends ObjectDefaultValue<P>> = [
  D
] extends [never]
  ? ObjectType<P, ObjectDefaultValue<P>>
  : [D] extends [ObjectDefaultValue<P>]
  ? ObjectType<P, D | ObjectDefaultValue<P>>
  : never;

export type IntersectionDefaultValue<
  P extends ObjectProps<Props>,
  D extends ObjectDefaultValue<P & any>
> = [D] extends [never] ? (P extends ObjectResultType<infer P2> ? ObjectResultDefaults<P2> : P) : D;

type ExtractProps<T> = T extends ObjectType<infer P, infer D> ? P : never;

export type IntersectionCombinedProps<T extends ObjectType<any, any>[]> = Simplify<
  T extends [infer Head, ...infer Tail]
    ? ExtractProps<Head> &
        (Tail extends ObjectType<any, any>[] ? IntersectionCombinedProps<Tail> : unknown)
    : unknown
>;

type ExtractDefault<T> = T extends ObjectType<infer P, infer D>
  ? IsAny<D> extends true
    ? ObjectResultDefaults<P>
    : IntersectionDefaultValue<P, D>
  : never;

export type IntersectionCombinedDefault<T extends ObjectType<any, any>[]> = T extends [
  infer Head,
  ...infer Tail
]
  ? Simplify<
      ExtractDefault<Head> &
        (Tail extends ObjectType<any, any>[] ? IntersectionCombinedDefault<Tail> : unknown)
    >
  : unknown;

export class IntersectionType<
  RTS extends Array<ObjectType<any>>,
  T extends ObjectProps<Props>,
  D extends ObjectDefaultValue<T>
> extends ObjectType<T, D> {
  constructor(types: RTS, options?: IntersectionTypeOptions<T, D>) {
    const props = types.reduce((mergedProps, type) => {
      Object.entries(type.getPropSchemas() as Record<string, any>).forEach(([key, value]) => {
        if (mergedProps[key] !== undefined) {
          throw new Error(`Duplicate key found in intersection: '${key}'`);
        }
        mergedProps[key as keyof T] = value;
      });

      return mergedProps;
    }, {} as T);

    super(props, options);
  }
}
