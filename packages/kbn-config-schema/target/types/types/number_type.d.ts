import { Type, TypeOptions } from './type';
export declare type NumberOptions = TypeOptions<number> & {
    min?: number;
    max?: number;
};
export declare class NumberType extends Type<number> {
    constructor(options?: NumberOptions);
    protected handleError(type: string, { limit, value }: Record<string, any>): string | undefined;
}
//# sourceMappingURL=number_type.d.ts.map