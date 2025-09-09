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

import {
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
} from './src/oas_meta_fields';
import type { DefaultValue } from './src/types/type';
import type { ObjectProps, ObjectDefaultValue } from './src/types/object_type';
import type { ByteSizeValue } from './src/byte_size_value';
import type { Reference } from './src/references';
import { ContextReference, SiblingReference } from './src/references';
import type {
  ArrayOptions,
  ByteSizeOptions,
  ConditionalTypeValue,
  DurationOptions,
  IntersectionTypeOptions,
  IpOptions,
  MapOfOptions,
  NumberOptions,
  ObjectTypeOptions,
  Props,
  NullableProps,
  RecordOfOptions,
  SchemaStructureEntry,
  StringOptions,
  TypeOf,
  TypeOfOutput,
  TypeOfInput,
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
import type { DurationValueType } from './src/types/duration_type';
import type { ByteSizeValueType } from './src/types/byte_size_type';

export type {
  AnyType,
  ConditionalType,
  TypeOf,
  TypeOfOutput,
  TypeOfInput,
  Props,
  SchemaStructureEntry,
  NullableProps,
};
export { ObjectType, Type };
export type { SchemaValidationOptions } from './src/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';

function any<D extends DefaultValue<any> = never>(options?: TypeOptions<any, D>): Type<any, D> {
  return new AnyType(options);
}

function boolean<D extends DefaultValue<boolean> = never>(
  options?: TypeOptions<boolean, D>
): Type<boolean, D> {
  return new BooleanType(options);
}

function buffer<D extends DefaultValue<Buffer> = never>(
  options?: TypeOptions<Buffer, D>
): Type<Buffer, D> {
  return new BufferType(options);
}

function stream<D extends DefaultValue<Stream> = never>(
  options?: TypeOptions<Stream, D>
): Type<Stream, D> {
  return new StreamType(options);
}

function string<D extends DefaultValue<string> = never>(
  options?: StringOptions<D>
): Type<string, D> {
  return new StringType(options);
}

function uri<D extends DefaultValue<string> = never>(options?: URIOptions<D>): Type<string, D> {
  return new URIType(options);
}

function literal<T extends string | number | boolean | null>(value: T): Type<T, T> {
  return new LiteralType(value);
}

function number<D extends DefaultValue<number> = never>(
  options?: NumberOptions<D>
): Type<number, D> {
  return new NumberType(options);
}

function byteSize<D extends ByteSizeValueType = never>(
  options?: ByteSizeOptions<D>
): Type<ByteSizeValue, [D] extends [never] ? never : ByteSizeValue> {
  return new ByteSizeType(options);
}

function duration<D extends DefaultValue<DurationValueType> = never>(
  options?: DurationOptions<D>
): Type<Duration, [D] extends [never] ? never : Duration> {
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
 *
 * @note wrapping with `maybe` ignores `defaultValue` on `type`.
 */
function maybe<V, D extends DefaultValue<V> = never>(type: Type<V, D>): Type<V | undefined, D> {
  return new MaybeType(type);
}

function nullable<V>(type: Type<V>): Type<V | null> {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: null });
}

function object<P extends ObjectProps<Props>, D extends ObjectDefaultValue<P> = never>(
  props: P,
  options?: ObjectTypeOptions<P, D>
): ObjectType<P, D> {
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

function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  DV extends DefaultValue<A | B | C | D | E | F | G | H | I | J | K | L> = never
>(
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
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L, DV>
): Type<A | B | C | D | E | F | G | H | I | J | K | L>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  DV extends DefaultValue<A | B | C | D | E | F | G | H | I | J | K> = never
>(
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
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K, DV>
): Type<A | B | C | D | E | F | G | H | I | J | K>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  DV extends DefaultValue<A | B | C | D | E | F | G | H | I | J> = never
>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>, Type<J>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J, DV>
): Type<A | B | C | D | E | F | G | H | I | J>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  DV extends DefaultValue<A | B | C | D | E | F | G | H | I> = never
>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I, DV>
): Type<A | B | C | D | E | F | G | H | I>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  DV extends DefaultValue<A | B | C | D | E | F | G | H> = never
>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H, DV>
): Type<A | B | C | D | E | F | G | H>;
function oneOf<A, B, C, D, E, F, G, DV extends DefaultValue<A | B | C | D | E | F | G> = never>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>],
  options?: UnionTypeOptions<A | B | C | D | E | F | G, DV>
): Type<A | B | C | D | E | F | G>;
function oneOf<A, B, C, D, E, F, DV extends DefaultValue<A | B | C | D | E | F> = never>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>],
  options?: UnionTypeOptions<A | B | C | D | E | F, DV>
): Type<A | B | C | D | E | F>;
function oneOf<A, B, C, D, E, DV extends DefaultValue<A | B | C | D | E> = never>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>],
  options?: UnionTypeOptions<A | B | C | D | E, DV>
): Type<A | B | C | D | E>;
function oneOf<A, B, C, D, DV extends DefaultValue<A | B | C | D> = never>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>],
  options?: UnionTypeOptions<A | B | C | D, DV>
): Type<A | B | C | D>;
function oneOf<A, B, C, DV extends DefaultValue<A | B | C> = never>(
  types: [Type<A>, Type<B>, Type<C>],
  options?: UnionTypeOptions<A | B | C, DV>
): Type<A | B | C>;
function oneOf<A, B, DV extends DefaultValue<A | B> = never>(
  types: [Type<A>, Type<B>],
  options?: UnionTypeOptions<A | B, DV>
): Type<A | B>;
function oneOf<A, DV extends DefaultValue<A> = never>(
  types: [Type<A>],
  options?: UnionTypeOptions<A, DV>
): Type<A>;
function oneOf<RTS extends Array<Type<any>>, DV extends DefaultValue<any> = never>(
  types: RTS,
  options?: UnionTypeOptions<any, DV>
): Type<any, DV> {
  return new UnionType(types, options);
}

function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  G extends ObjectProps<Props>,
  H extends ObjectProps<Props>,
  I extends ObjectProps<Props>,
  J extends ObjectProps<Props>,
  K extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F & G & H & I & J & K> = never
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
  options?: IntersectionTypeOptions<A & B & C & D & E & F & G & H & I & J & K, DV>
): ObjectType<A & B & C & D & E & F & G & H & I & J & K>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  G extends ObjectProps<Props>,
  H extends ObjectProps<Props>,
  I extends ObjectProps<Props>,
  J extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F & G & H & I & J> = never
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
  options?: IntersectionTypeOptions<A & B & C & D & E & F & G & H & I & J, DV>
): ObjectType<A & B & C & D & E & F & G & H & I & J>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  G extends ObjectProps<Props>,
  H extends ObjectProps<Props>,
  I extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F & G & H & I> = never
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
  options?: IntersectionTypeOptions<A & B & C & D & E & F & G & H & I, DV>
): ObjectType<A & B & C & D & E & F & G & H & I>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  G extends ObjectProps<Props>,
  H extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F & G & H> = never
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
  options?: IntersectionTypeOptions<A & B & C & D & E & F & G & H, DV>
): ObjectType<A & B & C & D & E & F & G & H>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  G extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F & G> = never
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
  options?: IntersectionTypeOptions<A & B & C & D & E & F & G, DV>
): ObjectType<A & B & C & D & E & F & G>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  F extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E & F> = never
>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>, ObjectType<F>],
  options?: IntersectionTypeOptions<A & B & C & D & E & F, DV>
): ObjectType<A & B & C & D & E & F>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  E extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D & E> = never
>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>],
  options?: IntersectionTypeOptions<A & B & C & D & E, DV>
): ObjectType<A & B & C & D & E>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  D extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C & D> = never
>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>],
  options?: IntersectionTypeOptions<A & B & C & D, DV>
): ObjectType<A & B & C & D>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  C extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B & C> = never
>(
  types: [ObjectType<A>, ObjectType<B>, ObjectType<C>],
  options?: IntersectionTypeOptions<A & B & C, DV>
): ObjectType<A & B & C>;
function allOf<
  A extends ObjectProps<Props>,
  B extends ObjectProps<Props>,
  DV extends ObjectDefaultValue<A & B> = never
>(
  types: [ObjectType<A>, ObjectType<B>],
  options?: IntersectionTypeOptions<A & B, DV>
): ObjectType<A & B, DV>;
function allOf<A extends ObjectProps<Props>, DV extends ObjectDefaultValue<A> = never>(
  types: [ObjectType<A>],
  options?: IntersectionTypeOptions<A, DV>
): ObjectType<A, DV>;
function allOf<RTS extends Array<ObjectType<any>>, DV extends ObjectDefaultValue<any> = never>(
  types: RTS,
  options?: IntersectionTypeOptions<any, DV>
): Type<any, DV> {
  return new IntersectionType(types, options);
}

function contextRef<T>(key: string): ContextReference<T> {
  return new ContextReference(key);
}

function siblingRef<T>(key: string): SiblingReference<T> {
  return new SiblingReference(key);
}

function conditional<
  A extends ConditionalTypeValue,
  B,
  C,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DV extends DefaultValue<B | C> = never
>(
  leftOperand: Reference<A>,
  rightOperand: Reference<A> | A | Type<unknown>,
  equalType: Type<B, BDV>,
  notEqualType: Type<C, CDV>,
  options?: TypeOptions<B | C, DV>
): Type<B | C, DV> {
  return new ConditionalType(leftOperand, rightOperand, equalType, notEqualType, options);
}

/**
 * Useful for creating recursive schemas.
 */
function lazy<T, D extends DefaultValue<T> = never>(id: string): Type<T, D> {
  return new Lazy<T, D>(id);
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

export const metaFields = Object.freeze({
  META_FIELD_X_OAS_DISCONTINUED,
  META_FIELD_X_OAS_ANY,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
});
