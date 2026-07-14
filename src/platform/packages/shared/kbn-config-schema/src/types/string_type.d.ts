import type { TypeOptions } from './type';
import { Type } from './type';
export type StringOptions = TypeOptions<string> & {
    minLength?: number;
    maxLength?: number;
    hostname?: boolean;
    coerceFromNumber?: boolean;
};
export declare class StringType extends Type<string> {
    constructor(options?: StringOptions);
    protected handleError(type: string, { limit, value }: Record<string, any>): string | undefined;
}
