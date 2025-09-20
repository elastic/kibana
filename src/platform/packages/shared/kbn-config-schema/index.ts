/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Duration } from 'moment';
import type { Stream } from 'stream';

import type { ByteSizeValue } from './src/byte_size_value';
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
  ObjectRawProps,
  NullableProps,
  RecordOfOptions,
  SchemaStructureEntry,
  StringOptions,
  TypeOf,
  TypeOptions,
  URIOptions,
  UnionTypeOptions,
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
  Type,
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
export type {
  AnyType,
  ConditionalType,
  TypeOf,
  ObjectRawProps,
  SchemaStructureEntry,
  NullableProps,
};
export { ObjectType, Type };
export type { SchemaValidationOptions } from './src/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

function any<D extends DefaultValue<any> = never>(options?: TypeOptions<any, any, D>): AnyType<D> {
  return new AnyType(options);
}

function boolean<D extends DefaultValue<boolean> = never>(
  options?: TypeOptions<boolean, boolean, D>
): BooleanType<D> {
  return new BooleanType(options);
}

function buffer<D extends DefaultValue<Buffer> = never>(
  options?: TypeOptions<Buffer, Buffer, D>
): BufferType<D> {
  return new BufferType(options);
}

function stream<D extends DefaultValue<Stream> = never>(
  options?: TypeOptions<Stream, Stream, D>
): StreamType<D> {
  return new StreamType(options);
}

function string<D extends DefaultValue<string> = never>(
  options?: StringOptions<D>
): Type<string, string, D> {
  return new StringType(options);
}

function uri<D extends DefaultValue<string> = never>(options?: URIOptions<D>): URIType<D> {
  return new URIType(options);
}

function literal<T extends string | number | boolean | null>(value: T): LiteralType<T> {
  return new LiteralType(value);
}

function number<D extends DefaultValue<number> = never>(
  options?: NumberOptions<D>
): Type<number, number, D> {
  return new NumberType(options);
}

function byteSize<D extends ByteSizeValueType = never>(
  options?: ByteSizeOptions<D>
): ByteSizeType<D> {
  return new ByteSizeType(options);
}

function duration<D extends DurationDefaultValue = never>(
  options?: DurationOptions<D>
): Type<Duration, Duration, [D] extends [never] ? never : Duration> {
  return new DurationType(options);
}

function never(): NeverType {
  return new NeverType();
}

function ip<D extends DefaultValue<string> = never>(options?: IpOptions<D>): IpType<D> {
  return new IpType(options);
}

/**
 * Create an optional type
 */
function maybe<V>(type: Type<V>): Type<V | undefined> {
  return new MaybeType(type);
}

function nullable<V>(type: Type<V>): Type<V | null> {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: null });
}

function object<P extends ObjectRawProps, D extends DefaultValue<ObjectInputType<P>> = never>(
  props: P,
  options?: ObjectTypeOptions<ObjectOutputType<P>, ObjectInputType<P>, D>
): ObjectType<P, ObjectOutputType<P>, ObjectInputType<P>, D> {
  return new ObjectType(props, options);
}

function arrayOf<T>(itemType: Type<T>, options?: ArrayOptions<T>): Type<T[]> {
  return new ArrayType(itemType, options);
}

function mapOf<K, V>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: MapOfOptions<K, V>
): Type<Map<K, V>> {
  return new MapOfType(keyType, valueType, options);
}

function recordOf<K extends string, V>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: RecordOfOptions<K, V>
): Type<Record<K, V>> {
  return new RecordOfType(keyType, valueType, options);
}

function union<
  T extends Readonly<[SomeType, ...SomeType[]]>,
  D extends DefaultValue<T[number]['_input']>
>(types: T, options?: UnionTypeOptions<T, D>): UnionType<T, D> {
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
  D extends DefaultValue<T1['_input'] & T2['_input'] & T3['_input'] & T4['_input']>
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
  D extends DefaultValue<T1['_input'] & T2['_input'] & T3['_input']>
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
  D extends DefaultValue<T1['_input'] & T2['_input']>
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

function conditional<A extends ConditionalTypeValue, B, C>(
  leftOperand: Reference<A>,
  rightOperand: Reference<A> | A | Type<unknown>,
  equalType: Type<B>,
  notEqualType: Type<C>,
  options?: TypeOptions<B | C>
) {
  return new ConditionalType(leftOperand, rightOperand, equalType, notEqualType, options);
}

/**
 * Useful for creating recursive schemas.
 */
function lazy<T>(id: string) {
  return new Lazy<T>(id);
}

export const schema = {
  allOf: intersection,
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

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
