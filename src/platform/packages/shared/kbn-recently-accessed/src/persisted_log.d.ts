import * as Rx from 'rxjs';
interface PersistedLogOptions<T = any> {
    maxLength: number | string;
    isEqual?: (oldItem: T, newItem: T) => boolean;
}
export declare class PersistedLog<T = any> {
    private name;
    private maxLength;
    private isEqual;
    private storage;
    private items$;
    constructor(name: string, options: PersistedLogOptions<T>, storage?: Storage);
    add(val: T): T[];
    removeIf(predicate: (item: T) => boolean): T[];
    get(): T[];
    get$(): Rx.Observable<T[]>;
    private persist;
    private loadItems;
}
export {};
