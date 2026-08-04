/**
 * Normalizes a date value to epoch milliseconds.
 *
 * ES|QL returns date strings (e.g. `"2024-01-01T00:00:00.000Z"`)
 * while esaggs returns epoch ms numbers. This helper accepts both
 * formats and always returns a numeric timestamp.
 */
export declare const toEpochMs: (val: unknown) => number;
