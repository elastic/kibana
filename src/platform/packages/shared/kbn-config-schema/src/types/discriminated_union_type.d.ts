import type { ExtendsDeepOptions } from './type';
import { Type } from './type';
import type { ObjectResultType, Props } from './object_type';
import type { ObjectType } from './object_type';
import type { UnionTypeOptions } from './union_type';
export type ObjectResultUnionType<T> = T extends Props ? ObjectResultType<T> : never;
export type PropsWithDiscriminator<Discriminator extends string, T extends Props> = Omit<T, Discriminator> & {
    [Key in Discriminator]: Type<string>;
};
export declare class DiscriminatedUnionType<Discriminator extends string, RTS extends Array<ObjectType<any>>, T extends PropsWithDiscriminator<Discriminator, Props>> extends Type<T> {
    private readonly discriminator;
    private readonly discriminatedValues;
    private readonly unionTypes;
    private readonly typeOptions?;
    constructor(discriminator: Discriminator, types: RTS, options?: UnionTypeOptions<T>);
    extendsDeep(options: ExtendsDeepOptions): DiscriminatedUnionType<Discriminator, ObjectType<any>[], T>;
    protected handleError(type: string, { value }: Record<string, any>, path: string[]): string | undefined;
}
