import type { SchemaTypesError } from '../errors';
import type { ExtendsDeepOptions } from './type';
import { Type, type TypeOptions } from './type';
export type UnionTypeOptions<T> = TypeOptions<T>;
export declare class UnionType<RTS extends Array<Type<any>>, T> extends Type<T> {
    private readonly unionTypes;
    private readonly typeOptions?;
    constructor(types: RTS, options?: UnionTypeOptions<T>);
    extendsDeep(options: ExtendsDeepOptions): UnionType<Type<any>[], T>;
    protected handleError(type: string, { value, details }: Record<string, any>, path: string[]): string | SchemaTypesError | undefined;
}
