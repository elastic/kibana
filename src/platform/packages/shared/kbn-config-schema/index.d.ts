import type { Duration } from 'moment';
import type { Stream } from 'stream';
import type { ByteSizeValue } from './src/byte_size_value';
import type { Reference } from './src/references';
import type { ContextReference, SiblingReference } from './src/references';
import type { ArrayOptions, ByteSizeOptions, ConditionalTypeValue, DurationOptions, IpOptions, MapOfOptions, NumberOptions, ObjectTypeOptions, ObjectResultType, Props, NullableProps, RecordOfOptions, SchemaStructureEntry, StringOptions, TypeOf, TypeOptions, URIOptions, UnionTypeOptions, PropsWithDiscriminator, ObjectResultUnionType , AnyType, ConditionalType, Lazy } from './src/types';
import { ObjectType, Type } from './src/types';
export type { AnyType, ConditionalType, TypeOf, Props, SchemaStructureEntry, NullableProps };
export { ObjectType, Type };
export type { SchemaValidationOptions } from './src/types';
export { ByteSizeValue } from './src/byte_size_value';
export { SchemaTypeError, ValidationError } from './src/errors';
export { isConfigSchema } from './src/typeguards';
export { offeringBasedSchema } from './src/helpers';
declare function any(options?: TypeOptions<any>): AnyType;
declare function boolean(options?: TypeOptions<boolean>): Type<boolean>;
declare function buffer(options?: TypeOptions<Buffer>): Type<Buffer>;
declare function stream(options?: TypeOptions<Stream>): Type<Stream>;
declare function string(options?: StringOptions): Type<string>;
declare function uri(options?: URIOptions): Type<string>;
declare function literal<T extends string | number | boolean | null>(value: T): Type<T>;
declare function number(options?: NumberOptions): Type<number>;
declare function byteSize(options?: ByteSizeOptions): Type<ByteSizeValue>;
declare function duration(options?: DurationOptions): Type<Duration>;
declare function never(): Type<never>;
declare function ip(options?: IpOptions): Type<string>;
/**
 * Create an optional type
 */
declare function maybe<V>(type: Type<V>): Type<V | undefined>;
declare function nullable<V>(type: Type<V>): Type<V | null>;
declare function object<P extends Props>(props: P, options?: ObjectTypeOptions<P>): ObjectType<P>;
declare function arrayOf<T>(itemType: Type<T>, options?: ArrayOptions<T>): Type<T[]>;
declare function mapOf<K, V>(keyType: Type<K>, valueType: Type<V>, options?: MapOfOptions<K, V>): Type<Map<K, V>>;
declare function recordOf<K extends string, V>(keyType: Type<K>, valueType: Type<V>, options?: RecordOfOptions<K, V>): Type<Record<K, V>>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q>(types: [
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
    Type<L>,
    Type<M>,
    Type<N>,
    Type<O>,
    Type<P>,
    Type<Q>
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q>): Type<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P>(types: [
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
    Type<L>,
    Type<M>,
    Type<N>,
    Type<O>,
    Type<P>
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P>): Type<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>(types: [
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
    Type<L>,
    Type<M>,
    Type<N>,
    Type<O>
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O>): Type<A | B | C | D | E | F | G | H | I | J | K | L | M | N | O>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L, M, N>(types: [
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
    Type<L>,
    Type<M>,
    Type<N>
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L | M | N>): Type<A | B | C | D | E | F | G | H | I | J | K | L | M | N>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L, M>(types: [
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
    Type<L>,
    Type<M>
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L | M>): Type<A | B | C | D | E | F | G | H | I | J | K | L | M>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K, L>(types: [
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
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K | L>): Type<A | B | C | D | E | F | G | H | I | J | K | L>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J, K>(types: [
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
], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J | K>): Type<A | B | C | D | E | F | G | H | I | J | K>;
declare function oneOf<A, B, C, D, E, F, G, H, I, J>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>, Type<J>], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I | J>): Type<A | B | C | D | E | F | G | H | I | J>;
declare function oneOf<A, B, C, D, E, F, G, H, I>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>, Type<I>], options?: UnionTypeOptions<A | B | C | D | E | F | G | H | I>): Type<A | B | C | D | E | F | G | H | I>;
declare function oneOf<A, B, C, D, E, F, G, H>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>, Type<H>], options?: UnionTypeOptions<A | B | C | D | E | F | G | H>): Type<A | B | C | D | E | F | G | H>;
declare function oneOf<A, B, C, D, E, F, G>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>, Type<G>], options?: UnionTypeOptions<A | B | C | D | E | F | G>): Type<A | B | C | D | E | F | G>;
declare function oneOf<A, B, C, D, E, F>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>, Type<F>], options?: UnionTypeOptions<A | B | C | D | E | F>): Type<A | B | C | D | E | F>;
declare function oneOf<A, B, C, D, E>(types: [Type<A>, Type<B>, Type<C>, Type<D>, Type<E>], options?: UnionTypeOptions<A | B | C | D | E>): Type<A | B | C | D | E>;
declare function oneOf<A, B, C, D>(types: [Type<A>, Type<B>, Type<C>, Type<D>], options?: UnionTypeOptions<A | B | C | D>): Type<A | B | C | D>;
declare function oneOf<A, B, C>(types: [Type<A>, Type<B>, Type<C>], options?: UnionTypeOptions<A | B | C>): Type<A | B | C>;
declare function oneOf<A, B>(types: [Type<A>, Type<B>], options?: UnionTypeOptions<A | B>): Type<A | B>;
declare function oneOf<A>(types: [Type<A>], options?: UnionTypeOptions<A>): Type<A>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>, H extends PropsWithDiscriminator<Discriminator, Props>, I extends PropsWithDiscriminator<Discriminator, Props>, J extends PropsWithDiscriminator<Discriminator, Props>, K extends PropsWithDiscriminator<Discriminator, Props>, L extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
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
    ObjectType<K>,
    ObjectType<L>
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J | K | L>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J | K | L>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>, H extends PropsWithDiscriminator<Discriminator, Props>, I extends PropsWithDiscriminator<Discriminator, Props>, J extends PropsWithDiscriminator<Discriminator, Props>, K extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
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
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J | K>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J | K>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>, H extends PropsWithDiscriminator<Discriminator, Props>, I extends PropsWithDiscriminator<Discriminator, Props>, J extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
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
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G | H | I | J>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>, H extends PropsWithDiscriminator<Discriminator, Props>, I extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>,
    ObjectType<I>
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G | H | I>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G | H | I>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>, H extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G | H>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G | H>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>, G extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>
], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F | G>>): Type<ObjectResultUnionType<A | B | C | D | E | F | G>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>, F extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>, ObjectType<F>], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E | F>>): Type<ObjectResultUnionType<A | B | C | D | E | F>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>, E extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D | E>>): Type<ObjectResultUnionType<A | B | C | D | E>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>, D extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C | D>>): Type<ObjectResultUnionType<A | B | C | D>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>, C extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>, ObjectType<B>, ObjectType<C>], options?: UnionTypeOptions<ObjectResultUnionType<A | B | C>>): Type<ObjectResultUnionType<A | B | C>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>, B extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>, ObjectType<B>], options?: UnionTypeOptions<ObjectResultUnionType<A | B>>): Type<ObjectResultUnionType<A | B>>;
declare function discriminatedUnion<Discriminator extends string, A extends PropsWithDiscriminator<Discriminator, Props>>(discriminator: Discriminator, types: [ObjectType<A>], options?: UnionTypeOptions<ObjectResultType<A>>): Type<ObjectResultType<A>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props, G extends Props, H extends Props, I extends Props, J extends Props, K extends Props>(types: [
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
], options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I & J & K>): Type<ObjectResultType<A & B & C & D & E & F & G & H & I & J & K>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props, G extends Props, H extends Props, I extends Props, J extends Props>(types: [
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
], options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I & J>): Type<ObjectResultType<A & B & C & D & E & F & G & H & I & J>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props, G extends Props, H extends Props, I extends Props>(types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>,
    ObjectType<I>
], options?: UnionTypeOptions<A & B & C & D & E & F & G & H & I>): Type<ObjectResultType<A & B & C & D & E & F & G & H & I>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props, G extends Props, H extends Props>(types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>,
    ObjectType<H>
], options?: UnionTypeOptions<A & B & C & D & E & F & G & H>): Type<ObjectResultType<A & B & C & D & E & F & G & H>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props, G extends Props>(types: [
    ObjectType<A>,
    ObjectType<B>,
    ObjectType<C>,
    ObjectType<D>,
    ObjectType<E>,
    ObjectType<F>,
    ObjectType<G>
], options?: UnionTypeOptions<A & B & C & D & E & F & G>): Type<ObjectResultType<A & B & C & D & E & F & G>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props, F extends Props>(types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>, ObjectType<F>], options?: UnionTypeOptions<A & B & C & D & E & F>): Type<ObjectResultType<A & B & C & D & E & F>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props, E extends Props>(types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>, ObjectType<E>], options?: UnionTypeOptions<A & B & C & D & E>): Type<ObjectResultType<A & B & C & D & E>>;
declare function allOf<A extends Props, B extends Props, C extends Props, D extends Props>(types: [ObjectType<A>, ObjectType<B>, ObjectType<C>, ObjectType<D>], options?: UnionTypeOptions<A & B & C & D>): Type<ObjectResultType<A & B & C & D>>;
declare function allOf<A extends Props, B extends Props, C extends Props>(types: [ObjectType<A>, ObjectType<B>, ObjectType<C>], options?: UnionTypeOptions<A & B & C>): Type<ObjectResultType<A & B & C>>;
declare function allOf<A extends Props, B extends Props>(types: [ObjectType<A>, ObjectType<B>], options?: UnionTypeOptions<A & B>): Type<ObjectResultType<A & B>>;
declare function allOf<A extends Props>(types: [ObjectType<A>], options?: UnionTypeOptions<A>): Type<ObjectResultType<A>>;
declare function contextRef<T>(key: string): ContextReference<T>;
declare function siblingRef<T>(key: string): SiblingReference<T>;
declare function conditional<A extends ConditionalTypeValue, B, C>(leftOperand: Reference<A>, rightOperand: Reference<A> | A | Type<unknown>, equalType: Type<B>, notEqualType: Type<C>, options?: TypeOptions<B | C>): ConditionalType<A, B, C>;
/**
 * Useful for creating recursive schemas.
 */
declare function lazy<T>(id: string): Lazy<T>;
export declare const schema: {
    allOf: typeof allOf;
    any: typeof any;
    arrayOf: typeof arrayOf;
    boolean: typeof boolean;
    buffer: typeof buffer;
    byteSize: typeof byteSize;
    conditional: typeof conditional;
    contextRef: typeof contextRef;
    duration: typeof duration;
    intersection: typeof allOf;
    ip: typeof ip;
    lazy: typeof lazy;
    literal: typeof literal;
    mapOf: typeof mapOf;
    maybe: typeof maybe;
    nullable: typeof nullable;
    never: typeof never;
    number: typeof number;
    object: typeof object;
    oneOf: typeof oneOf;
    union: typeof oneOf;
    discriminatedUnion: typeof discriminatedUnion;
    recordOf: typeof recordOf;
    stream: typeof stream;
    siblingRef: typeof siblingRef;
    string: typeof string;
    uri: typeof uri;
};
export type Schema = typeof schema;
export declare const metaFields: Readonly<{
    META_FIELD_X_OAS_DISCONTINUED: "x-oas-discontinued";
    META_FIELD_X_OAS_AVAILABILITY: "x-oas-availability";
    META_FIELD_X_OAS_ANY: "x-oas-any-type";
    META_FIELD_X_OAS_OPTIONAL: "x-oas-optional";
    META_FIELD_X_OAS_DEPRECATED: "x-oas-deprecated";
    META_FIELD_X_OAS_MAX_LENGTH: "x-oas-max-length";
    META_FIELD_X_OAS_MIN_LENGTH: "x-oas-min-length";
    META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES: "x-oas-get-additional-properties";
    META_FIELD_X_OAS_DISCRIMINATOR: "x-oas-discriminator";
    META_FIELD_X_OAS_DISCRIMINATOR_DEFAULT_CASE: "x-oas-discriminator-default-case";
}>;
