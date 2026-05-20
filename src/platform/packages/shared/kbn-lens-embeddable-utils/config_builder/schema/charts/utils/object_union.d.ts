import type { ObjectType } from '@kbn/config-schema';
import { Type } from '@kbn/config-schema';
import type { ObjectResultType, Props, TypeOptions } from '@kbn/config-schema/src/types';
import { SchemaTypesError } from '@kbn/config-schema/src/errors';
type SomeObjectType = ObjectType<any>;
/**
 * A custom schema type used in lens for object unions with ability to extend
 */
export declare function objectUnion<T extends [SomeObjectType, ...SomeObjectType[]]>(types: T, options?: TypeOptions<T[number]['type']>): ObjectUnionType<T, T[number]["type"]>;
/**
 * Extends `Type` with duplicate logic from `UnionType` from `@kbn/config-schema`
 */
export declare class ObjectUnionType<RTS extends Array<SomeObjectType>, T> extends Type<T> {
    private readonly unionTypes;
    private readonly typeOptions?;
    constructor(types: RTS, options?: TypeOptions<T>);
    /**
     * Returns generic schema type
     *
     * All `@kbn/config-schema` types are either `Type` or `ObjectType` but this limits the extension of custom
     * types as this would wipe away custom methods and overrides.
     */
    toType(): Type<T>;
    /**
     * Use this to merge one union type with another
     *
     * @example
     * ```ts
     * const union = objectUnion([type1, type2]);
     * const newUnion = objectUnion([...union.getUnionTypes(), type3]);
     * ```
     */
    getUnionTypes(): RTS;
    extends<P extends Props>(props: P, options?: TypeOptions<ObjectResultType<P> & T>): ObjectUnionType<RTS, Readonly<{ [K in keyof ({ [Key in keyof P]: undefined extends import("@kbn/config-schema").TypeOf<P[Key]> ? Key : never; }[keyof P] extends infer T_1 extends keyof P ? { [P_1 in T_1]: P[P_1]; } : never)]?: import("@kbn/config-schema").TypeOf<P[K]> | undefined; } & { [K_1 in keyof ({ [Key_1 in keyof P]: undefined extends import("@kbn/config-schema").TypeOf<P[Key_1]> ? never : Key_1; }[keyof P] extends infer T_2 extends keyof P ? { [P_2 in T_2]: P[P_2]; } : never)]: import("@kbn/config-schema").TypeOf<P[K_1]>; }> & T>;
    protected handleError(type: string, { value, details }: Record<string, any>, path: string[]): string | SchemaTypesError | undefined;
}
export {};
