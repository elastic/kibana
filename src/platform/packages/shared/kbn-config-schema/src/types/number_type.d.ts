import type { TypeOptions } from './type';
import { Type } from './type';
export type NumberOptions = TypeOptions<number> & {
    min?: number;
    max?: number;
    /**
     * When set to true, will accept unsafe numbers (integers > 2^53).
     * Otherwise, unsafe numbers will fail validation.
     * Default: `false`
     */
    unsafe?: boolean;
};
export declare class NumberType extends Type<number> {
    constructor(options?: NumberOptions);
    protected handleError(type: string, { limit, value }: Record<string, any>): string | undefined;
}
