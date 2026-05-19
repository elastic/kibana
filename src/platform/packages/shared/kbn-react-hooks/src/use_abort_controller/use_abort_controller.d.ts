export declare function useAbortController(): {
    signal: AbortSignal;
    abort: () => void;
    refresh: () => void;
};
