import * as t from 'io-ts';
/**
 * Converts string value to a Typescript enum
 *  - "foo" -> MyEnum.foo
 *
 * @param name Enum name
 * @param originalEnum Typescript enum
 * @returns Codec
 */
export declare function enumeration<EnumType extends string>(name: string, originalEnum: Record<string, EnumType>): t.Type<EnumType, EnumType, unknown>;
