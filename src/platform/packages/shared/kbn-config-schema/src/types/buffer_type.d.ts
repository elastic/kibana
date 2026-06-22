import type { TypeOptions } from './type';
import { Type } from './type';
export declare class BufferType extends Type<Buffer> {
    constructor(options?: TypeOptions<Buffer>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
