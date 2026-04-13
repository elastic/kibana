import type { TypeOptions, ExtendsDeepOptions, UnknownOptions } from './type';
import { Type } from './type';
export type Props = Record<string, Type<any>>;
export type NullableProps = Record<string, Type<any> | undefined | null>;
export type TypeOrLazyType = Type<any> | (() => Type<any>);
export type TypeOf<RT extends TypeOrLazyType> = RT extends () => Type<any> ? ReturnType<RT>['type'] : RT extends Type<any> ? RT['type'] : never;
type OptionalProperties<Base extends Props> = Pick<Base, {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? Key : never;
}[keyof Base]>;
type RequiredProperties<Base extends Props> = Pick<Base, {
    [Key in keyof Base]: undefined extends TypeOf<Base[Key]> ? never : Key;
}[keyof Base]>;
export type ObjectResultType<P extends Props> = Readonly<{
    [K in keyof OptionalProperties<P>]?: TypeOf<P[K]>;
} & {
    [K in keyof RequiredProperties<P>]: TypeOf<P[K]>;
}>;
type DefinedProperties<Base extends NullableProps> = Pick<Base, {
    [Key in keyof Base]: undefined extends Base[Key] ? never : null extends Base[Key] ? never : Key;
}[keyof Base]>;
type ExtendedProps<P extends Props, NP extends NullableProps> = Omit<P, keyof NP> & {
    [K in keyof DefinedProperties<NP>]: NP[K];
};
type ExtendedObjectType<P extends Props, NP extends NullableProps> = ObjectType<ExtendedProps<P, NP>>;
type ExtendedObjectTypeOptions<P extends Props, NP extends NullableProps> = ObjectTypeOptions<ExtendedProps<P, NP>>;
interface ObjectTypeOptionsMeta {
    /**
     * A string that uniquely identifies this schema. Used when generating OAS
     * to create refs instead of inline schemas.
     */
    id?: string;
}
export type ObjectTypeOptions<P extends Props = any> = TypeOptions<ObjectResultType<P>> & UnknownOptions & {
    meta?: TypeOptions<ObjectResultType<P>>['meta'] & ObjectTypeOptionsMeta;
};
export declare class ObjectType<P extends Props = any> extends Type<ObjectResultType<P>> {
    private props;
    private options;
    private propSchemas;
    constructor(props: P, options?: ObjectTypeOptions<P>);
    /**
     * Return a new `ObjectType` instance extended with given `newProps` properties.
     * Original properties can be deleted from the copy by passing a `null` or `undefined` value for the key.
     *
     * @example
     * How to add a new key to an object schema
     * ```ts
     * const origin = schema.object({
     *   initial: schema.string(),
     * });
     *
     * const extended = origin.extends({
     *   added: schema.number(),
     * });
     * ```
     *
     * How to remove an existing key from an object schema
     * ```ts
     * const origin = schema.object({
     *   initial: schema.string(),
     *   toRemove: schema.number(),
     * });
     *
     * const extended = origin.extends({
     *   toRemove: undefined,
     * });
     * ```
     *
     * How to override the schema's options
     * ```ts
     * const origin = schema.object({
     *   initial: schema.string(),
     * }, { defaultValue: { initial: 'foo' }});
     *
     * const extended = origin.extends({
     *   added: schema.number(),
     * }, { defaultValue: { initial: 'foo', added: 'bar' }});
     *
     * @remarks
     * `extends` only support extending first-level properties. It's currently not possible to perform deep/nested extensions.
     *
     * ```ts
     * const origin = schema.object({
     *   foo: schema.string(),
     *   nested: schema.object({
     *     a: schema.string(),
     *     b: schema.string(),
     *   }),
     * });
     *
     * const extended = origin.extends({
     *   nested: schema.object({
     *     c: schema.string(),
     *   }),
     * });
     *
     * // TypeOf<typeof extended> is `{ foo: string; nested: { c: string } }`
     * ```
     */
    extends<NP extends NullableProps>(newProps: NP, newOptions?: ExtendedObjectTypeOptions<P, NP>): ExtendedObjectType<P, NP>;
    extendsDeep(options: ExtendsDeepOptions): ObjectType<P>;
    protected handleError(type: string, { reason, value, child }: Record<string, any>): any;
    /**
     * Return the schema for this object's underlying properties
     */
    getPropSchemas(): P;
    validateKey(key: string, value: any): any;
}
export {};
