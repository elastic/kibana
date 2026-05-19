import type { IStorage, IStorageWrapper } from './types';
export declare class Storage implements IStorageWrapper {
    store: IStorage;
    constructor(store: IStorage);
    get: (key: string) => any;
    set: (key: string, value: any, includeUndefined?: boolean) => false | void;
    remove: (key: string) => any;
    clear: () => void;
}
