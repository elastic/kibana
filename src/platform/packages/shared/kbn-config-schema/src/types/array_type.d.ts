import type { TypeOptions, ExtendsDeepOptions, UnknownOptions } from './type';
import { Type } from './type';
export type ArrayOptions<T> = TypeOptions<T[]> & UnknownOptions & {
    minSize?: number;
    maxSize?: number;
};
export declare class ArrayType<T> extends Type<T[]> {
    private readonly arrayType;
    private readonly arrayOptions;
    constructor(type: Type<T>, options?: ArrayOptions<T>);
    extendsDeep(options: ExtendsDeepOptions): ArrayType<T>;
    protected handleError(type: string, { limit, reason, value }: Record<string, any>): any;
}
