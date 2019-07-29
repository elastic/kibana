import { Type, TypeOptions } from './type';
export declare type ArrayOptions<T> = TypeOptions<T[]> & {
    minSize?: number;
    maxSize?: number;
};
export declare class ArrayType<T> extends Type<T[]> {
    constructor(type: Type<T>, options?: ArrayOptions<T>);
    protected handleError(type: string, { limit, reason, value }: Record<string, any>): any;
}
//# sourceMappingURL=array_type.d.ts.map