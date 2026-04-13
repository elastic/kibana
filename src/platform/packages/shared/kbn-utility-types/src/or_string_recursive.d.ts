/**
 * Recursively transform a type so that each value can be either its original type or a string.
 * This is useful for types that may contain template strings (like Liquid templates) that will
 * be rendered at runtime.
 *
 * @example
 * type Input = { name: string; age: number; items: Array<{ id: number }> };
 * type RawInput = OrStringRecursive<Input>;
 * // Result: { name: string; age: number | string; items: Array<{ id: number | string }> | string }
 */
export type OrStringRecursive<T> = T extends Array<infer U> ? Array<OrStringRecursive<U>> | string : T extends object ? {
    [K in keyof T]: OrStringRecursive<T[K]>;
} : T | string;
