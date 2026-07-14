type StorageType = 'local' | 'session';
/** Storage helper with key namespacing and JSON serialization */
export declare class StorageHelper {
    private readonly keyPrefix;
    constructor(keyPrefix: string);
    private getKey;
    set<T>(key: string, value: T, storageType?: StorageType): void;
    get<T>(key: string, storageType?: StorageType): T | null;
}
export {};
