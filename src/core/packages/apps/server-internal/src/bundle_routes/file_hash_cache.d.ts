/** @internal */
export interface IFileHashCache {
    get(key: string): Promise<string> | undefined;
    set(key: string, value: Promise<string>): void;
    del(key: string): void;
}
/** @internal */
export declare class FileHashCache implements IFileHashCache {
    private lru;
    constructor(maxItems?: number);
    get(key: string): Promise<string> | undefined;
    set(key: string, value: Promise<string>): void;
    del(key: string): void;
}
