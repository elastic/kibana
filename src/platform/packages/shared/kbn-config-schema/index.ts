/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Stream } from 'stream';

import type { Reference } from './src/references';
import { ContextReference, SiblingReference } from './src/references';
import type {
  ArrayOptions,
  ByteSizeOptions,
  ConditionalTypeValue,
  DurationOptions,
  IpOptions,
  MapOfOptions,
  NumberOptions,
  ObjectTypeOptions,
  PreciseObjectProps,
  RecordOfOptions,
  StringOptions,
  TypeOptions,
  URIOptions,
  UnionTypeOptions,
  Type,
} from './src/types';
import {
  AnyType,
  ArrayType,
  BooleanType,
  BufferType,
  ByteSizeType,
  ConditionalType,
  DurationType,
  IntersectionType,
  IpType,
  LiteralType,
  MapOfType,
  MaybeType,
  NeverType,
  NumberType,
  ObjectType,
  RecordOfType,
  StringType,
  UnionType,
  URIType,
  StreamType,
  Lazy,
} from './src/types';
import type { DurationDefaultValue } from './src/types/duration_type';
import type { ByteSizeValueType } from './src/types/byte_size_type';

import type { DefaultValue, SomeType } from './src/types/type';
import type { ObjectInputType, ObjectOutputType, SomeObjectType } from './src/types/object_type';
import type { IntersectionInput, IntersectionOutput } from './src/types/intersection_type';

export type { SomeType, SomeObjectType };
export type { SchemaOf, TypeOf, TypeOfOutput, TypeOfInput } from './src/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

// bucket export to avoid naming collisions
export type * from './deprecated';

/**
 * Used to define props to pass to `schema.object`.
 *
 * @note should *only* be used with `satisfies` to ensure the correct type is inferred.
 *
 * @example
 * ```ts
 * const mySchemaProps = {
 *   name: schema.string(),
 *   age: schema.number(),
 * } satisfies ObjectProps;
 * const mySchema = schema.object(mySchemaProps);
 * ```
 */
export type ObjectProps = PreciseObjectProps;

function any<D extends DefaultValue<any> = never>(
  options?: TypeOptions<any, any, D>
): Type<any, any, D> {
  return new AnyType(options);
}

function boolean<D extends DefaultValue<boolean> = never>(
  options?: TypeOptions<boolean, boolean, D>
): Type<boolean, boolean, D> {
  return new BooleanType(options);
}

function buffer<D extends DefaultValue<Buffer> = never>(
  options?: TypeOptions<Buffer, Buffer, D>
): Type<Buffer, Buffer, D> {
  return new BufferType(options);
}

function stream<D extends DefaultValue<Stream> = never>(
  options?: TypeOptions<Stream, Stream, D>
): Type<Stream, Stream, D> {
  return new StreamType(options);
}

function string<D extends DefaultValue<string> = never>(
  options?: StringOptions<D>
): Type<string, string, D> {
  return new StringType(options);
}

function uri<D extends DefaultValue<string> = never>(
  options?: URIOptions<D>
): Type<string, string, D> {
  return new URIType(options);
}

function literal<T extends string | number | boolean | null>(value: T): Type<T, T, never> {
  return new LiteralType(value);
}

/**
 * Creates a literal union type from an array of string literals.
 *
 * @example
 * ```ts
 * const myEnums = ['foo', 'bar', 'baz'] as const;
 * const myEnumType = schema.enum(myEnums);
 * ```
 * @example
 * ```ts
 * enum status {
 *   PENDING = 'pending',
 *   WAITING = 'waiting',
 *   COMPLETED = 'completed',
 * }
 * const myEnumType = schema.enum(status);
 * ```
 */
function enumeration<U extends string, D extends DefaultValue<U> = never>(
  enumObj: Record<string, U>,
  options?: TypeOptions<U, U, D>
): Type<U, U, D>;
function enumeration<U extends string, D extends DefaultValue<U> = never>(
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  values: [U, ...U[]] | readonly [U, ...U[]] | U[] | readonly U[],
  options?: TypeOptions<U, U, D>
): Type<U, U, D>;
function enumeration<U extends string, D extends DefaultValue<U> = never>(
  enumObj: Record<string, U> | U[],
  options?: TypeOptions<U, U, D>
): Type<U, U, D> {
  const values = Array.isArray(enumObj) ? enumObj : Object.values(enumObj);
  const literalTypes = values.map((value) => literal(value)) as any;
  return union(literalTypes, options);
}

function number<D extends DefaultValue<number> = never>(
  options?: NumberOptions<D>
): Type<number, number, D> {
  return new NumberType(options);
}

function byteSize<D extends ByteSizeValueType = never>(
  options?: ByteSizeOptions<D>
): Type<ByteSizeValue, ByteSizeValue, [D] extends [never] ? never : ByteSizeValue> {
  return new ByteSizeType(options);
}

function duration<D extends DurationDefaultValue = never>(
  options?: DurationOptions<D>
): Type<Duration, Duration, [D] extends [never] ? never : Duration> {
  return new DurationType(options);
}

function never(): Type<never, never, never> {
  return new NeverType();
}

function ip<D extends DefaultValue<string> = never>(
  options?: IpOptions<D>
): Type<string, string, D> {
  return new IpType(options);
}

/**
 * Creates an optional type
 *
 * @note wrapping with `maybe` ignores the `defaultValue` on `type` when validating.
 */
function maybe<T extends SomeType>(
  type: T
): Type<T['_output'] | undefined, T['_input'] | undefined, any> {
  return new MaybeType(type);
}

/**
 * Creates an nullable type, defaults to `null`.
 *
 * @note wrapping with `nullable` ignores the `defaultValue` from the `type` when validating.
 */
function nullable<T extends SomeType>(type: T) {
  return union([type, literal(null)], { defaultValue: null });
}

function object<
  T extends SomeObjectType,
  P extends T['props'], // must derive props from general type to infer precise types
  D extends DefaultValue<ObjectInputType<P>> = never
>(
  props: P,
  options?: ObjectTypeOptions<ObjectOutputType<P>, ObjectInputType<P>, D>
): ObjectType<P, ObjectOutputType<P>, ObjectInputType<P>, D> {
  return new ObjectType(props, options);
}

function arrayOf<T extends SomeType, D extends DefaultValue<T['_input'][]> = never>(
  itemType: T,
  options?: ArrayOptions<T, D>
): Type<T['_output'][], T['_input'][], D> {
  return new ArrayType(itemType, options);
}

function mapOf<K, T extends SomeType, D extends DefaultValue<Map<K, T['_input']>> = never>(
  keyType: Type<K>,
  valueType: T,
  options?: MapOfOptions<K, T, D>
): Type<Map<K, T['_output']>, Map<K, T['_input']>, D> {
  return new MapOfType(keyType, valueType, options);
}

function recordOf<
  K extends string,
  T extends SomeType,
  D extends DefaultValue<Record<K, T['_input']>> = never
>(
  keyType: Type<K>,
  valueType: T,
  options?: RecordOfOptions<K, T['_input'], D>
): Type<Record<K, T['_output']>, Record<K, T['_input']>, D> {
  return new RecordOfType(keyType, valueType, options);
}

function union<
  T extends Readonly<[SomeType, ...SomeType[]]>,
  D extends DefaultValue<T[number]['_input']> = never
>(types: T, options?: UnionTypeOptions<T, D>): Type<T[number]['_output'], T[number]['_input'], D> {
  return new UnionType(types, options);
}

/**
 * Create intersection schema from multiple object schemas, max 4 object types.
 *
 * @example
 * ```ts
 * const mySchema = schema.allOf([
 *   schema.object({ str: schema.string() }),
 *   schema.object({ num: schema.number() }}),
 * ]);
 * ```
 */
function intersection<
  T1 extends SomeObjectType,
  T2 extends SomeObjectType,
  T3 extends SomeObjectType,
  T4 extends SomeObjectType,
  D extends DefaultValue<T1['_input'] & T2['_input'] & T3['_input'] & T4['_input']> = never
>(
  types: [T1, T2, T3, T4],
  options?: ObjectTypeOptions<
    T1['_output'] & T2['_output'] & T3['_output'] & T4['_output'],
    T1['_input'] & T2['_input'] & T3['_input'] & T4['_input'],
    D
  >
): IntersectionType<[T1, T2, T3, T4], D>;
function intersection<
  T1 extends SomeObjectType,
  T2 extends SomeObjectType,
  T3 extends SomeObjectType,
  D extends DefaultValue<T1['_input'] & T2['_input'] & T3['_input']> = never
>(
  types: [T1, T2, T3],
  options?: ObjectTypeOptions<
    T1['_output'] & T2['_output'] & T3['_output'],
    T1['_input'] & T2['_input'] & T3['_input'],
    D
  >
): IntersectionType<[T1, T2, T3], D>;
function intersection<
  T1 extends SomeObjectType,
  T2 extends SomeObjectType,
  D extends DefaultValue<T1['_input'] & T2['_input']> = never
>(
  types: [T1, T2],
  options?: ObjectTypeOptions<T1['_output'] & T2['_output'], T1['_input'] & T2['_input'], D>
): IntersectionType<[T1, T2], D>;
function intersection<
  T extends Readonly<[SomeObjectType, ...SomeObjectType[]]>,
  D extends DefaultValue<IntersectionInput<T>> = never
>(
  types: T,
  options?: ObjectTypeOptions<IntersectionOutput<T>, IntersectionInput<T>, D>
): IntersectionType<T, D> {
  return new IntersectionType(types, options);
}

function contextRef<T = any>(key: string): ContextReference<T> {
  return new ContextReference(key);
}

function siblingRef<T = any>(key: string): SiblingReference<T> {
  return new SiblingReference(key);
}

function conditional<
  T extends ConditionalTypeValue,
  A extends SomeType,
  B extends SomeType,
  D extends DefaultValue<A['_input'] | B['_input']> = never
>(
  leftOperand: Reference<T>,
  rightOperand: Reference<T> | T | Type<unknown>,
  equalType: A,
  notEqualType: B,
  options?: ConditionalTypeOptions<A, B, D>
): Type<A['_output'] | B['_output'], A['_input'] | B['_input'], D> {
  return new ConditionalType(leftOperand, rightOperand, equalType, notEqualType, options);
}

/**
 * Useful for creating recursive schemas.
 */
function lazy<T>(id: string): Type<T, T> {
  return new Lazy<T>(id);
}

export const schema = {
  allOf: intersection,
  enum: enumeration,
  any,
  arrayOf,
  boolean,
  buffer,
  byteSize,
  conditional,
  contextRef,
  duration,
  intersection,
  ip,
  lazy,
  literal,
  mapOf,
  maybe,
  nullable,
  never,
  number,
  object,
  union,
  oneOf: union,
  recordOf,
  stream,
  siblingRef,
  string,
  uri,
};

export type Schema = typeof schema;

import {
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} from './src/oas_meta_fields';
import type { ConditionalTypeOptions } from './src/types/conditional_type';
import type { ByteSizeValue } from './src/byte_size_value';
import type { Duration } from './src/duration';

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
