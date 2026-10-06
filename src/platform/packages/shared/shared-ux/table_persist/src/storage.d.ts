type IStorageEngine = typeof window.localStorage;
declare class Storage {
    engine: IStorageEngine;
    prefix: string;
    encode(val: unknown): string;
    decode(val: string | null): any;
    encodeKey(key: string): string;
    set(key: string, val: unknown): unknown;
    has(key: string): boolean;
    get<T>(key: string, _default?: T): any;
}
export declare function createStorage(): Storage;
export {};
