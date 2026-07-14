/**
 * Given a record type `{a: X; b: Y}`, produces a distributed union:
 * `{ type: "a"; value: X } | { type: "b"; value: Y }`.
 */
export type FromExternalVariant<T extends Record<string, unknown>> = T extends any ? {
    [K in keyof T]: {
        type: K;
        value: T[K];
    };
}[keyof T] : never;
export declare function fromExternalVariant<T extends Record<string, unknown>>(obj: T): FromExternalVariant<T>;
