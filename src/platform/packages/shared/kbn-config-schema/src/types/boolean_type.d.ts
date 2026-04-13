import type { TypeOptions } from './type';
import { Type } from './type';
export declare class BooleanType extends Type<boolean> {
    constructor(options?: TypeOptions<boolean>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
