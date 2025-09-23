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

import type { SomeType } from './src/types/type';
import type {
  ObjectInputType,
  ObjectOutputType,
  ObjectProps,
  SomeObjectType,
} from './src/types/object_type';
import type { IntersectionInput, IntersectionOutput } from './src/types/intersection_type';

// bucket export to avoid naming collisions
export type * from './deprecated';

export type { SomeType, SomeObjectType, ObjectProps };
export type { SchemaOf, TypeOf, TypeOfOutput, TypeOfInput } from './src/helpers/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

function any(options?: TypeOptions<any>): Type<any> {
  return new AnyType(options);
}

function boolean(options?: TypeOptions<boolean>): BooleanType {
  return new BooleanType(options);
}

function buffer(options?: TypeOptions<Buffer>): Type<Buffer> {
  return new BufferType(options);
}

function stream(options?: TypeOptions<Stream>): Type<Stream> {
  return new StreamType(options);
}

function string(options?: StringOptions): Type<string> {
  return new StringType(options);
}

function uri(options?: URIOptions): Type<string> {
  return new URIType(options);
}

function literal<T extends string | number | boolean | null>(value: T): LiteralType<T> {
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
function enumeration<U extends string>(
  enumObj: Record<string, U>,
  options?: TypeOptions<U>
): Type<U>;
function enumeration<U extends string>(
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  values: [U, ...U[]] | readonly [U, ...U[]] | U[] | readonly U[],
  options?: TypeOptions<U>
): Type<U>;
function enumeration<U extends string>(
  enumObj: Record<string, U> | U[],
  options?: TypeOptions<U>
): Type<U> {
  const values = Array.isArray(enumObj) ? enumObj : Object.values(enumObj);
  const literalTypes = values.map((value) => literal(value)) as any;
  return union(literalTypes, options);
}

function number(options?: NumberOptions): Type<number> {
  return new NumberType(options);
}

function byteSize(options?: ByteSizeOptions): ByteSizeType {
  return new ByteSizeType(options);
}

function duration(options?: DurationOptions): DurationType {
  return new DurationType(options);
}

function never(): Type<never> {
  return new NeverType();
}

function ip(options?: IpOptions): Type<string> {
  return new IpType(options);
}

/**
 * Creates an optional type
 *
 * @note wrapping with `maybe` ignores the `defaultValue` on `type` when validating.
 */
function maybe<T extends SomeType>(
  type: T
): Type<T['_output'] | undefined, T['_input'] | undefined> {
  return new MaybeType(type);
}

/**
 * Creates an nullable type, defaults to `null`.
 *
 * @note wrapping with `nullable` ignores the `defaultValue` from the `type` when validating.
 */
function nullable<T extends SomeType>(type: T): Type<T['_output'] | null, T['_input'] | null> {
  return union([type, literal(null)], { defaultValue: null });
}

function object<P extends ObjectProps>(
  props: P,
  options?: ObjectTypeOptions<ObjectOutputType<P>, ObjectInputType<P>>
): ObjectType<P, ObjectOutputType<P>, ObjectInputType<P>> {
  return new ObjectType(props, options);
}

function arrayOf<T extends SomeType>(
  itemType: T,
  options?: ArrayOptions<T>
): Type<T['_output'][], T['_input'][]> {
  return new ArrayType(itemType, options);
}

function mapOf<K, T extends SomeType>(
  keyType: Type<K>,
  valueType: T,
  options?: MapOfOptions<K, T>
): Type<Map<K, T['_output']>, Map<K, T['_input']>> {
  return new MapOfType(keyType, valueType, options);
}

function recordOf<K extends string, T extends SomeType>(
  keyType: Type<K>,
  valueType: T,
  options?: RecordOfOptions<K, T['_input']>
): Type<Record<K, T['_output']>, Record<K, T['_input']>> {
  return new RecordOfType(keyType, valueType, options);
}

function union<T extends Readonly<[SomeType, ...SomeType[]]>>(
  types: T,
  options?: UnionTypeOptions<T>
): Type<T[number]['_output'], T[number]['_input']> {
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
  T4 extends SomeObjectType
>(
  types: [T1, T2, T3, T4],
  options?: ObjectTypeOptions<
    T1['_output'] & T2['_output'] & T3['_output'] & T4['_output'],
    T1['_input'] & T2['_input'] & T3['_input'] & T4['_input']
  >
): IntersectionType<[T1, T2, T3, T4]>;
function intersection<
  T1 extends SomeObjectType,
  T2 extends SomeObjectType,
  T3 extends SomeObjectType
>(
  types: [T1, T2, T3],
  options?: ObjectTypeOptions<
    T1['_output'] & T2['_output'] & T3['_output'],
    T1['_input'] & T2['_input'] & T3['_input']
  >
): IntersectionType<[T1, T2, T3]>;
function intersection<T1 extends SomeObjectType, T2 extends SomeObjectType>(
  types: [T1, T2],
  options?: ObjectTypeOptions<T1['_output'] & T2['_output'], T1['_input'] & T2['_input']>
): IntersectionType<[T1, T2]>;
function intersection<T extends Readonly<[SomeObjectType, ...SomeObjectType[]]>>(
  types: T,
  options?: ObjectTypeOptions<IntersectionOutput<T>, IntersectionInput<T>>
): IntersectionType<T> {
  return new IntersectionType(types, options);
}

function contextRef<T = any>(key: string): ContextReference<T> {
  return new ContextReference(key);
}

function siblingRef<T = any>(key: string): SiblingReference<T> {
  return new SiblingReference(key);
}

function conditional<T extends ConditionalTypeValue, A extends SomeType, B extends SomeType>(
  leftOperand: Reference<T>,
  rightOperand: Reference<T> | T | Type<unknown>,
  equalType: A,
  notEqualType: B,
  options?: ConditionalTypeOptions<A, B>
): Type<A['_output'] | B['_output'], A['_input'] | B['_input']> {
  return new ConditionalType(leftOperand, rightOperand, equalType, notEqualType, options);
}

/**
 * Useful for creating recursive schemas.
 */
function lazy<T>(id: string): Type<T> {
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

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
