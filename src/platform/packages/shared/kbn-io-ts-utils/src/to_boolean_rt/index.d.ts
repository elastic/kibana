import * as t from 'io-ts';
export declare function isPrimitive(value: unknown): value is string | number | boolean | null | undefined;
export declare const toBooleanRt: t.Type<boolean, boolean, unknown>;
