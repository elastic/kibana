import type { Writable } from 'stream';
export declare class MaxSizeStringBuilder {
    private stream;
    private maxSizeBytes;
    private bom;
    private size;
    private pristine;
    constructor(stream: Writable, maxSizeBytes: number, bom?: string);
    tryAppend(chunk: string): boolean;
    getSizeInBytes(): number;
}
