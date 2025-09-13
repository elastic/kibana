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
  META_FIELD_X_OAS_MAX_LENGTH,
  META_FIELD_X_OAS_MIN_LENGTH,
  META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES,
  META_FIELD_X_OAS_OPTIONAL,
  META_FIELD_X_OAS_DEPRECATED,
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
import type { UnionBaseType, UnionDefaultValue } from './src/types/union_type';

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
 * Creates an optional type
 *
 * @note wrapping with `maybe` ignores the `defaultValue` on `type` when validating.
 */
function maybe<V, D extends DefaultValue<V> = never>(type: Type<V, D>): Type<V | undefined, D> {
  return new MaybeType(type);
}

/**
 * Creates an nullable type, defaults to `null`.
 *
 * @note wrapping with `nullable` ignores the `defaultValue` on `type` when validating.
 */
function nullable<V, D extends DefaultValue<V> = never>(type: UnionBaseType<V, D>) {
  return schema.oneOf([type, schema.literal(null)], { defaultValue: null });
}

function object<P extends ObjectProps<Props>, D extends ObjectDefaultValue<P> = never>(
  props: P,
  options?: ObjectTypeOptions<P, D>
): ObjectType<P, D> {
  return new ObjectType(props, options);
}

function arrayOf<V, D extends DefaultValue<V>, DA extends DefaultValue<V[]> = never>(
  itemType: Type<V, D>,
  options?: ArrayOptions<V, DA>
): Type<V[], DA> {
  return new ArrayType(itemType, options);
}

function mapOf<K, V, D extends DefaultValue<Map<K, V>>>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: MapOfOptions<K, V, D>
): Type<Map<K, V>, D> {
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
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  HDV extends DefaultValue<H> = never,
  IDV extends DefaultValue<I> = never,
  JDV extends DefaultValue<J> = never,
  KDV extends DefaultValue<K> = never,
  LDV extends DefaultValue<L> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV>
    | UnionDefaultValue<H, HDV>
    | UnionDefaultValue<I, IDV>
    | UnionDefaultValue<J, JDV>
    | UnionDefaultValue<K, KDV>
    | UnionDefaultValue<L, LDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>,
    UnionBaseType<H, HDV>,
    UnionBaseType<I, IDV>,
    UnionBaseType<J, JDV>,
    UnionBaseType<K, KDV>,
    UnionBaseType<L, LDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L, DV>
): Type<A | B | C | D | E | F | G | H | I | J | K | L, DV>;
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
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  HDV extends DefaultValue<H> = never,
  IDV extends DefaultValue<I> = never,
  JDV extends DefaultValue<J> = never,
  KDV extends DefaultValue<K> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV>
    | UnionDefaultValue<H, HDV>
    | UnionDefaultValue<I, IDV>
    | UnionDefaultValue<J, JDV>
    | UnionDefaultValue<K, KDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>,
    UnionBaseType<H, HDV>,
    UnionBaseType<I, IDV>,
    UnionBaseType<J, JDV>,
    UnionBaseType<K, KDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K, DV>
): Type<A | B | C | D | E | F | G | H | I | J | K, DV>;
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
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  HDV extends DefaultValue<H> = never,
  IDV extends DefaultValue<I> = never,
  JDV extends DefaultValue<J> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV>
    | UnionDefaultValue<H, HDV>
    | UnionDefaultValue<I, IDV>
    | UnionDefaultValue<J, JDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>,
    UnionBaseType<H, HDV>,
    UnionBaseType<I, IDV>,
    UnionBaseType<J, JDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J, DV>
): Type<A | B | C | D | E | F | G | H | I | J, DV>;
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
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  HDV extends DefaultValue<H> = never,
  IDV extends DefaultValue<I> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV>
    | UnionDefaultValue<H, HDV>
    | UnionDefaultValue<I, IDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>,
    UnionBaseType<H, HDV>,
    UnionBaseType<I, IDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I, DV>
): Type<A | B | C | D | E | F | G | H | I, DV>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  HDV extends DefaultValue<H> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV>
    | UnionDefaultValue<H, HDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>,
    UnionBaseType<H, HDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G | H, DV>
): Type<A | B | C | D | E | F | G | H, DV>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  GDV extends DefaultValue<G> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV>
    | UnionDefaultValue<G, GDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>,
    UnionBaseType<G, GDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F | G, DV>
): Type<A | B | C | D | E | F | G, DV>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  F,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  FDV extends DefaultValue<F> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV>
    | UnionDefaultValue<F, FDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>,
    UnionBaseType<F, FDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E | F, DV>
): Type<A | B | C | D | E | F, DV>;
function oneOf<
  A,
  B,
  C,
  D,
  E,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  EDV extends DefaultValue<E> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV>
    | UnionDefaultValue<E, EDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>,
    UnionBaseType<E, EDV>
  ],
  options?: UnionTypeOptions<A | B | C | D | E, DV>
): Type<A | B | C | D | E, DV>;
function oneOf<
  A,
  B,
  C,
  D,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DDV extends DefaultValue<D> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV>
    | UnionDefaultValue<D, DDV> = never
>(
  types: [
    UnionBaseType<A, ADV>,
    UnionBaseType<B, BDV>,
    UnionBaseType<C, CDV>,
    UnionBaseType<D, DDV>
  ],
  options?: UnionTypeOptions<A | B | C | D, DV>
): Type<A | B | C | D, DV>;
function oneOf<
  A,
  B,
  C,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  CDV extends DefaultValue<C> = never,
  DV extends
    | UnionDefaultValue<A, ADV>
    | UnionDefaultValue<B, BDV>
    | UnionDefaultValue<C, CDV> = never
>(
  types: [UnionBaseType<A, ADV>, UnionBaseType<B, BDV>, UnionBaseType<C, CDV>],
  options?: UnionTypeOptions<A | B | C, DV>
): Type<A | B | C, DV>;
function oneOf<
  A,
  B,
  ADV extends DefaultValue<A> = never,
  BDV extends DefaultValue<B> = never,
  DV extends UnionDefaultValue<A, ADV> | UnionDefaultValue<B, BDV> = never
>(
  types: [UnionBaseType<A, ADV>, UnionBaseType<B, BDV>],
  options?: UnionTypeOptions<A | B, DV>
): Type<A | B, DV>;
function oneOf<
  A,
  ADV extends DefaultValue<A> = never,
  DV extends UnionDefaultValue<A, ADV> = never
>(Type: [UnionBaseType<A, ADV>], options?: UnionTypeOptions<A, DV>): Type<A, DV>;
function oneOf<RTS extends Array<Type<any>>, DV extends DefaultValue<any> = never>(
  types: RTS,
  options?: UnionTypeOptions<any, DV>
): Type<any, any> {
  return new UnionType(types, options) as any;
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

function contextRef<T = any>(key: string): ContextReference<T> {
  return new ContextReference(key);
}

function siblingRef<T = any>(key: string): SiblingReference<T> {
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
