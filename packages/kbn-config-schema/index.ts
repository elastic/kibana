/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration } from 'moment';
import { Stream } from 'stream';

import { ByteSizeValue } from './src/byte_size_value';
import { ContextReference, Reference, SiblingReference } from './src/references';
import {
  AnyType,
  ArrayOptions,
  ArrayType,
  BooleanType,
  BufferType,
  ByteSizeOptions,
  ByteSizeType,
  ConditionalType,
  ConditionalTypeValue,
  DurationOptions,
  DurationType,
  IpOptions,
  IpType,
  LiteralType,
  MapOfOptions,
  MapOfType,
  MaybeType,
  NeverType,
  NumberOptions,
  NumberType,
  ObjectType,
  ObjectTypeOptions,
  Props,
  NullableProps,
  RecordOfOptions,
  RecordOfType,
  SchemaStructureEntry,
  StringOptions,
  StringType,
  Type,
  TypeOf,
  TypeOfOutput,
  TransformedType,
  TypeOptions,
  UnionType,
  URIOptions,
  URIType,
  StreamType,
  UnionTypeOptions,
  Lazy,
} from './src/types';

export type {
  AnyType,
  ConditionalType,
  TypeOf,
  TypeOfOutput,
  Props,
  SchemaStructureEntry,
  NullableProps,
  TransformedType,
};
export { ObjectType, Type };
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

function any(options?: TypeOptions<any>) {
  return new AnyType(options);
}

function boolean(options?: TypeOptions<boolean>): Type<boolean> {
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

function literal<T extends string | number | boolean | null>(value: T): Type<T> {
  return new LiteralType(value);
}

function number(options?: NumberOptions): Type<number> {
  return new NumberType(options);
}

function byteSize(options?: ByteSizeOptions): Type<ByteSizeValue> {
  return new ByteSizeType(options);
}

function duration(options?: DurationOptions): Type<Duration> {
  return new DurationType(options);
}

function never(): Type<never> {
  return new NeverType();
}

function ip(options?: IpOptions): Type<string> {
  return new IpType(options);
}

/**
 * Create an optional type
 */
function maybe<V, R>(type: Type<V, R>): Type<V | undefined, R | undefined> {
  return new MaybeType(type);
}

function nullable<V, R>(type: Type<V, R>): Type<V | null, R | null> {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: null });
}

function object<P extends Props>(props: P, options?: ObjectTypeOptions<P>): ObjectType<P> {
  return new ObjectType(props, options);
}

function arrayOf<T, R>(itemType: Type<T, R>, options?: ArrayOptions<T>): Type<T[], R[]> {
  return new ArrayType(itemType, options);
}

function mapOf<K, V, R>(
  keyType: Type<K>,
  valueType: Type<V, R>,
  options?: MapOfOptions<K, V>
): Type<Map<K, V>, R> {
  return new MapOfType(keyType, valueType, options);
}

function recordOf<K extends string, V, R>(
  keyType: Type<K>,
  valueType: Type<V, R>,
  options?: RecordOfOptions<K, V>
): Type<Record<K, V>, R> {
  return new RecordOfType(keyType, valueType, options);
}

function oneOf<RTS extends Array<Type<unknown, unknown>>>(
  types: [...RTS],
  options?: UnionTypeOptions<any>
): Type<TypeOf<RTS[number]>, TypeOfOutput<RTS[number]>> {
  return new UnionType(types, options);
}

function contextRef<T>(key: string): ContextReference<T> {
  return new ContextReference(key);
}

function siblingRef<T>(key: string): SiblingReference<T> {
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
function lazy<T, R = T>(id: string) {
  return new Lazy<T, R>(id);
}

export const schema = {
  any,
  arrayOf,
  boolean,
  buffer,
  byteSize,
  conditional,
  contextRef,
  duration,
  ip,
  lazy,
  literal,
  mapOf,
  maybe,
  nullable,
  never,
  number,
  object,
  oneOf,
  recordOf,
  stream,
  siblingRef,
  string,
  uri,
};

export type Schema = typeof schema;

import {
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} from './src/oas_meta_fields';

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
