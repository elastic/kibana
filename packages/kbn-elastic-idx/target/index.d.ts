/**
 * DeepRequiredArray
 * Nested array condition handler
 */
interface DeepRequiredArray<T> extends Array<DeepRequired<T>> {
}
/**
 * DeepRequiredObject
 * Nested object condition handler
 */
declare type DeepRequiredObject<T> = {
    [P in keyof T]-?: DeepRequired<T[P]>;
};
/**
 * Function that has deeply required return type
 */
declare type FunctionWithRequiredReturnType<T extends (...args: any[]) => any> = T extends (...args: infer A) => infer R ? (...args: A) => DeepRequired<R> : never;
/**
 * DeepRequired
 * Required that works for deeply nested structure
 */
declare type DeepRequired<T> = NonNullable<T> extends never ? T : T extends any[] ? DeepRequiredArray<T[number]> : T extends (...args: any[]) => any ? FunctionWithRequiredReturnType<T> : NonNullable<T> extends object ? DeepRequiredObject<NonNullable<T>> : T;
export declare function idx<T1, T2>(input: T1, accessor: (input: NonNullable<DeepRequired<T1>>) => T2): T2 | undefined;
export {};
