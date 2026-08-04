import * as React from 'react';
export declare const useAsyncMemo: <T>(fn: () => Promise<T>, deps: React.DependencyList) => T | undefined;
