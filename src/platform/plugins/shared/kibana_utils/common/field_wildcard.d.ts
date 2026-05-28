export declare const makeRegEx: ((glob: string) => RegExp) & import("lodash").MemoizedFunction;
export declare function fieldWildcardMatcher(globs?: string[], metaFields?: unknown[]): (val: unknown) => boolean;
export declare function fieldWildcardFilter(globs?: string[], metaFields?: string[]): (val: unknown) => boolean;
