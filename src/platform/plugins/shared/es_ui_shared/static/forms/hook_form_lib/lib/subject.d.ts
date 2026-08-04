type Listener<T> = (value: T) => void;
export interface Subscription {
    unsubscribe: () => void;
}
export declare class Subject<T> {
    private callbacks;
    value: T;
    constructor(value: T);
    subscribe(fn: Listener<T>): Subscription;
    next(value: T): void;
}
export {};
