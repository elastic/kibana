/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  IntersectionType,
  IntersectionTypeOptions,
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
  ObjectResultType,
  Props,
  NullableProps,
  RecordOfOptions,
  RecordOfType,
  SchemaStructureEntry,
  StringOptions,
  StringType,
  Type,
  TypeOf,
  TypeOptions,
  UnionType,
  URIOptions,
  URIType,
  StreamType,
  UnionTypeOptions,
  Lazy,
} from './src/types';

export type { AnyType, ConditionalType, TypeOf, Props, SchemaStructureEntry, NullableProps };
export { ObjectType, Type };
export type { SchemaValidationOptions } from './src/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

function any<D extends DefaultValue<any> = never>(options?: TypeOptions<any, D>): Type<any, D> {
  return new AnyType(options);
}

function boolean<D extends DefaultValue<boolean> = never>(options?: TypeOptions<boolean, D>): Type<boolean, D> {
  return new BooleanType(options);
}

function buffer<D extends DefaultValue<Buffer> = never>(options?: TypeOptions<Buffer, D>): Type<Buffer, D> {
  return new BufferType(options);
}

function stream<D extends DefaultValue<Stream> = never>(options?: TypeOptions<Stream, D>): Type<Stream, D> {
  return new StreamType(options);
}

function string<D extends DefaultValue<string> = never>(options?: StringOptions<D>): Type<string, D> {
  return new StringType(options);
}

function uri<D extends DefaultValue<string> = never>(options?: URIOptions<D>): Type<string, D> {
  return new URIType(options);
}

function literal<T extends string | number | boolean | null, D extends DefaultValue<T>>(value: T): Type<T, D> {
  return new LiteralType(value);
}

function number<D extends DefaultValue<number> = never>(
  options?: NumberOptions<D>
): Type<number, D> {
  return new NumberType(options);
}

function byteSize<D extends ByteSizeValue = never>(options?: ByteSizeOptions<D>): Type<ByteSizeValue, D> {
  return new ByteSizeType(options);
}

function duration<D extends DefaultValue<Duration> = never>(options?: DurationOptions<D>): Type<Duration, D> {
  return new DurationType(options);
}

function never(): Type<never, never> {
  return new NeverType();
}

function ip<D extends DefaultValue<string> = never>(options?: IpOptions<D>): Type<string, D> {
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

function object<
  P extends ObjectProps<Props>,
  D extends DefaultValue<ObjectResultTypeInput<P>> = never
>(props: P, options?: ObjectTypeOptions<P, D>): ObjectType<P, D> {
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

function recordOf<K extends string, V, D extends DefaultValue<Record<K, V>>>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: RecordOfOptions<K, V, D>
): Type<Record<K, V>, D> {
  return new RecordOfType(keyType, valueType, options);
}

function oneOf<A, B, C, D, E, F, G, H, I, J, K, L>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>,
    Type<J>,
    Type<K>,
    Type<L>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L>
): Type<A | B | C | D | E | F | G | H | I | J | K | L>;
function oneOf<A, B, C, D, E, F, G, H, I, J, K>(
  types: [
    Type<A>,
    Type<B>,
    Type<C>,
    Type<D>,
    Type<E>,
    Type<F>,
    Type<G>,
    Type<H>,
    Type<I>,
    Type<J>,
    Type<K>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K>
): Type<A | B | C | D | E | F | G | H | I | J | K>;
function oneOf<A, B, C, D, E, F, G, H, I, J>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>, Type<J>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J>
): Type<A | B | C | D | E | F | G | H | I | J>;
function oneOf<A, B, C, D, E, F, G, H, I>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I>
): Type<A | B | C | D | E | F | G | H | I>;
function oneOf<A, B, C, D, E, F, G, H>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H>
): Type<A | B | C | D | E | F | G | H>;
function oneOf<A, B, C, D, E, F, G>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G>
): Type<A | B | C | D | E | F | G>;
function oneOf<A, B, C, D, E, F>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>],
  options?: UnionTypeOptions<A | B | C | D | E | F>
): Type<A | B | C | D | E | F>;
function oneOf<A, B, C, D, E>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>],
  options?: UnionTypeOptions<A | B | C | D | E>
): Type<A | B | C | D | E>;
function oneOf<A, B, C, D>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>],
  options?: UnionTypeOptions<A | B | C | D>
): Type<A | B | C | D>;
function oneOf<A, B, C>(
  types: [Type<A>, Type<B>, Type<C>],
  options?: UnionTypeOptions<A | B | C>
): Type<A | B | C>;
function oneOf<A, B>(types: [Type<A>, Type<B>], options?: UnionTypeOptions<A | B>): Type<A | B>;
function oneOf<A>(types: [Type<A>], options?: UnionTypeOptions<A>): Type<A>;
function oneOf<RTS extends Array<Type<any>>>(
  types: RTS,
  options?: UnionTypeOptions<any>
): Type<any> {
  return new UnionType(types, options);
}

function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props,
  G extends Props,
  H extends Props,
  I extends Props,
  J extends Props,
  K extends Props
>(
  types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>,
    ObjectType<I>,
    ObjectType<J>,
    ObjectType<K>
  ],
  options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I & J & K>
): Type<ObjectResultType<A & B & C & D & E & F & G & H & I & J & K>>;
function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props,
  G extends Props,
  H extends Props,
  I extends Props,
  J extends Props
>(
  types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>,
    ObjectType<I>,
    ObjectType<J>
  ],
  options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I & J>
): Type<ObjectResultType<A & B & C & D & E & F & G & H & I & J>>;
function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props,
  G extends Props,
  H extends Props,
  I extends Props
>(
  types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>,
    ObjectType<I>
  ],
  options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I>
): Type<ObjectResultType<A & B & C & D & E & F & G & H & I>>;
function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props,
  G extends Props,
  H extends Props
>(
  types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>
  ],
  options?: UnionTypeOptions<A & B & C & D & E & F & G & H>
): Type<ObjectResultType<A & B & C & D & E & F & G & H>>;
function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props,
  G extends Props
>(
  types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>
  ],
  options?: UnionTypeOptions<A & B & C & D & E & F & G>
): Type<ObjectResultType<A & B & C & D & E & F & G>>;
function allOf<
  A extends Props,
  B extends Props,
  C extends Props,
  D extends Props,
  E extends Props,
  F extends Props
>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>, ObjectType<F>],
  options?: UnionTypeOptions<A & B & C & D & E & F>
): Type<ObjectResultType<A & B & C & D & E & F>>;
function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>],
  options?: UnionTypeOptions<A & B & C & D & E>
): Type<ObjectResultType<A & B & C & D & E>>;
function allOf<A extends Props, B extends Props, C extends Props, D extends Props>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>],
  options?: UnionTypeOptions<A & B & C & D>
): Type<ObjectResultType<A & B & C & D>>;
function allOf<A extends Props, B extends Props, C extends Props>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>],
  options?: UnionTypeOptions<A & B & C>
): Type<ObjectResultType<A & B & C>>;
function allOf<A extends Props, B extends Props>(
  types: [ObjectType<A>, ObjectType<B>],
  options?: UnionTypeOptions<A & B>
): Type<ObjectResultType<A & B>>;
function allOf<A extends Props>(
  types: [ObjectType<A>],
  options?: UnionTypeOptions<A>
): Type<ObjectResultType<A>>;
function allOf<RTS extends Array<ObjectType<any>>>(
  types: RTS,
  options?: IntersectionTypeOptions<any>
): Type<any> {
  return new IntersectionType(types, options);
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
function lazy<T>(id: string) {
  return new Lazy<T>(id);
}

export const schema = {
  allOf,
  any,
  arrayOf,
  boolean,
  buffer,
  byteSize,
  conditional,
  contextRef,
  duration,
  intersection: allOf,
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
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} from './src/oas_meta_fields';
import { DefaultValue } from './src/types/type';
import {
  ObjectProps,
  ObjectResultTypeInput,
} from './src/types/object_type';

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
