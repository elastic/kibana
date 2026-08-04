type UnwrapArray<T> = T extends Array<infer U> ? U : T;
export declare function toArray<T>(value: T): UnwrapArray<T>[];
export {};
