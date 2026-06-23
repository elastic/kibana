import type { Stream } from 'stream';
import type { TypeOptions } from './type';
import { Type } from './type';
export declare class StreamType extends Type<Stream> {
    constructor(options?: TypeOptions<Stream>);
    protected handleError(type: string, { value }: Record<string, any>): string | undefined;
}
