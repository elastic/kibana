type IStorageEngine = typeof window.localStorage;
export declare enum StorageKeys {
    SIZE = "panelSize",
    FOLDS = "folds",
    VARIABLES = "variables",
    DEFAULT_LANGUAGE = "defaultLanguage"
}
export declare class Storage {
    private readonly engine;
    private readonly prefix;
    constructor(engine: IStorageEngine, prefix: string);
    encode(val: unknown): string;
    decode(val: string | null): any;
    encodeKey(key: string): string;
    decodeKey(key: string): string | undefined;
    set(key: string, val: unknown): unknown;
    has(key: string): boolean;
    get<T>(key: string, _default?: T): any;
    delete(key: string): void;
    keys(): string[];
}
export declare function createStorage(deps: {
    engine: IStorageEngine;
    prefix: string;
}): Storage;
export declare const getStorage: import("@kbn/kibana-utils-plugin/public").Get<Storage>, setStorage: import("@kbn/kibana-utils-plugin/public").Set<Storage>;
export {};
