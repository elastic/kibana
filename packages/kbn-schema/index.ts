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
import {
  AnyType,
  ArrayOptions,
  ArrayType,
  BooleanType,
  LiteralType,
  MaybeType,
  NeverType,
  NumberOptions,
  NumberType,
  ObjectType,
  ObjectTypeOptions,
  Props,
  NullableProps,
  SchemaStructureEntry,
  StringOptions,
  StringType,
  Type,
  TypeOf,
  TypeOptions,
  UnionType,
} from './src/types';

export type { AnyType, TypeOf, Props, SchemaStructureEntry, NullableProps };
export { ObjectType, Type };
export { ByteSizeValue } from './src/byte_size_value';
export { ValidationError } from './src/errors';
export { isKbnSchema } from './src/typeguards';

function any(options?: TypeOptions<any>) {
  return new AnyType(options);
}

function boolean(options?: TypeOptions<boolean>): Type<boolean> {
  return new BooleanType(options);
}

function buffer(options?: TypeOptions<Buffer>): Type<Buffer> {
  throw new Error('Not implemented');
}

function stream(options?: TypeOptions<Stream>): Type<Stream> {
  throw new Error('Not implemented');
}

function string(options?: StringOptions): Type<string> {
  return new StringType(options);
}

function literal<T extends string | number | boolean | null>(value: T): Type<T> {
  return new LiteralType(value);
}

function number(options?: NumberOptions): Type<number> {
  return new NumberType(options);
}

function byteSize(options?: unknown): Type<ByteSizeValue> {
  throw new Error('Not implemented');
}

function duration(options?: unknown): Type<Duration> {
  throw new Error('Not implemented');
}

function never(): Type<never> {
  return new NeverType();
}

function ip(options?: unknown): Type<string> {
  throw new Error('Not implemented');
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

function object<P extends Props>(props: P, options?: ObjectTypeOptions<P>): ObjectType<P> {
  return new ObjectType(props, options);
}

function arrayOf<T>(itemType: Type<T>, options?: ArrayOptions<T>): Type<T[]> {
  return new ArrayType(itemType, options);
}

function mapOf<K, V>(keyType: Type<K>, valueType: Type<V>, options?: unknown): Type<Map<K, V>> {
  throw new Error('Not implemented');
}

function recordOf<K extends string, V>(
  keyType: Type<K>,
  valueType: Type<V>,
  options?: unknown
): Type<Record<K, V>> {
  throw new Error('Not implemented');
}

function oneOf<A, B, C, D, E, F, G, H, I, J>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>, Type<J>],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I | J>
): Type<A | B | C | D | E | F | G | H | I | J>;
function oneOf<A, B, C, D, E, F, G, H, I>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>],
  options?: TypeOptions<A | B | C | D | E | F | G | H | I>
): Type<A | B | C | D | E | F | G | H | I>;
function oneOf<A, B, C, D, E, F, G, H>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>],
  options?: TypeOptions<A | B | C | D | E | F | G | H>
): Type<A | B | C | D | E | F | G | H>;
function oneOf<A, B, C, D, E, F, G>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>],
  options?: TypeOptions<A | B | C | D | E | F | G>
): Type<A | B | C | D | E | F | G>;
function oneOf<A, B, C, D, E, F>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>],
  options?: TypeOptions<A | B | C | D | E | F>
): Type<A | B | C | D | E | F>;
function oneOf<A, B, C, D, E>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>],
  options?: TypeOptions<A | B | C | D | E>
): Type<A | B | C | D | E>;
function oneOf<A, B, C, D>(
  types: [Type<A>, Type<B>, Type<C>, Type<D>],
  options?: TypeOptions<A | B | C | D>
): Type<A | B | C | D>;
function oneOf<A, B, C>(
  types: [Type<A>, Type<B>, Type<C>],
  options?: TypeOptions<A | B | C>
): Type<A | B | C>;
function oneOf<A, B>(types: [Type<A>, Type<B>], options?: TypeOptions<A | B>): Type<A | B>;
function oneOf<A>(types: [Type<A>], options?: TypeOptions<A>): Type<A>;
function oneOf<RTS extends Array<Type<any>>>(types: RTS, options?: TypeOptions<any>): Type<any> {
  return new UnionType(types, options);
}

export const schema = {
  any,
  arrayOf,
  boolean,
  buffer,
  byteSize,
  duration,
  ip,
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
  string,
};

export type Schema = typeof schema;
