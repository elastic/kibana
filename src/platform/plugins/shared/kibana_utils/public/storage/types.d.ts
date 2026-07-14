export interface IStorageWrapper<T = any, S = void> {
    get: (key: string) => T | null;
    set: (key: string, value: T) => S;
    remove: (key: string) => T | null;
    clear: () => void;
}
export interface IStorage<T = any, S = void> {
    getItem: (key: string) => T | null;
    setItem: (key: string, value: T) => S;
    removeItem: (key: string) => T | null;
    clear: () => void;
}
