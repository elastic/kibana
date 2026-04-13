export declare function withTimeout<T>({ promise, timeoutMs, }: {
    promise: Promise<T>;
    timeoutMs: number;
}): Promise<{
    timedout: true;
} | {
    timedout: false;
    value: T;
}>;
export declare function isPromise<T>(maybePromise: T | Promise<T>): maybePromise is Promise<T>;
