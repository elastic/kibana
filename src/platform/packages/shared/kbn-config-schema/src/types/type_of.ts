/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ObjectProps,
  ObjectResultType,
  ObjectTypeOrLazyType,
  Props,
  TypeOrLazyType,
} from './object_type';
import type { Type } from './type';

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

/**
 * Resulting schema type.
 *
 * @alias `TypeOfOutput`
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOf<typeof mySchema>;
 * ```
 */
export type TypeOf<RT extends TypeOrLazyType> = TypeOfOutput<RT>;

/**
 * Output type of schema after all defaults are applied.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfOutput<typeof mySchema>;
 * ```
 */
export type TypeOfOutput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> = Simplify<
  RT extends ObjectTypeOrLazyType<infer V, infer D>
    ? ObjectTypeOutput<V>
    : RT extends Type<infer V, infer D>
    ? V extends ObjectResultType<infer P>
      ? ObjectTypeOutput<P>
      : Type<V, D>['_output']
    : never
>;

type ObjectTypeOutput<P extends ObjectProps<Props>> = {
  [K in keyof Omit<P, keyof OptionalOutputProperties<P>>]: TypeOfOutput<P[K]>;
} & {
  [K in keyof OptionalOutputProperties<P>]?: TypeOfOutput<P[K]>;
};

type OptionalOutputProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends ObjectTypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : never
      : Base[Key] extends TypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : never
      : never;
  }[keyof Base]
>;

/**
 * Input type of schema accounting for all `defaultValues` provided.
 *
 * @example
 * ```ts
 * const mySchema = schema.object({ num: schema.number() });
 *
 * const MySchemaType = TypeOfInput<typeof mySchema>;
 * ```
 */
export type TypeOfInput<RT extends TypeOrLazyType | ObjectTypeOrLazyType> = Simplify<
  RT extends ObjectTypeOrLazyType<infer V, infer D>
    ? [D] extends [never]
      ? ObjectTypeInput<V>
      : ObjectTypeInput<V> | undefined
    : RT extends TypeOrLazyType<infer V, infer D>
    ? V extends ObjectResultType<infer P>
      ? ObjectTypeInput<P>
      : Type<V, D>['_input']
    : never
>;

type ObjectTypeInput<P extends ObjectProps<Props>> = {
  [K in keyof Omit<P, keyof OptionalInputProperties<P>>]: TypeOfInput<P[K]>;
} & {
  [K in keyof OptionalInputProperties<P>]?: TypeOfInput<P[K]>;
};

export type OptionalInputProperties<Base extends ObjectProps<Props>> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends ObjectTypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : [D] extends [never]
        ? never
        : Key
      : Base[Key] extends TypeOrLazyType<infer V, infer D>
      ? V extends undefined
        ? Key
        : [D] extends [never]
        ? never
        : Key
      : never;
  }[keyof Base]
>;
