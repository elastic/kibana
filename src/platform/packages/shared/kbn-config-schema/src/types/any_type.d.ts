import type { TypeOptions } from './type';
import { Type } from './type';
export declare class AnyType extends Type<any> {
    constructor(options?: TypeOptions<any>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
