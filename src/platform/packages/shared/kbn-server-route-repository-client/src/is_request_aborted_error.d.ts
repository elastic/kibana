export declare function isRequestAbortedError(error: unknown): error is Error & {
    name: 'AbortError';
};
