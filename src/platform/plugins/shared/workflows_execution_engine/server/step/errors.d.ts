import { ExecutionError } from '@kbn/workflows/server';
export declare const DEFAULT_MAX_STEP_SIZE = "10mb";
/**
 * Formats a byte count into a human-readable string (e.g., "15.2 MB").
 */
export declare function formatBytes(bytes: number): string;
/**
 * Parses a byte size string (e.g., "10mb", "15MB", "1gb", "500kb") into bytes.
 * Also accepts raw numbers (treated as bytes).
 */
export declare function parseByteSize(value: string | number): number;
/**
 * Safely measures the serialized size of an output value.
 * For Buffer outputs (binary HTTP responses) uses the raw byte length directly,
 * avoiding the ~4x amplification from JSON.stringify({ type: "Buffer", data: [...] }).
 * Returns the byte count on success, or `null` if the value is not serializable
 * to JSON. This covers both the throwing cases (circular references, BigInt)
 * and the silent ones — `JSON.stringify(undefined)` and `JSON.stringify(fn)`
 * return `undefined` rather than throwing, and would otherwise be mis-sized
 * as the 9-byte string "undefined" by `Buffer.byteLength`. A `null` result is
 * a hard signal: the value cannot be persisted to ES, so callers must fail
 * closed (refuse the output / treat as oversized) rather than silently allow
 * it through.
 */
export declare function safeOutputSize(output: unknown): number | null;
/**
 * Error thrown when a step's response or output exceeds the configured size limit.
 * Used by both Layer 1 (pre-emptive I/O enforcement) and Layer 2 (base class output guard).
 */
export declare class ResponseSizeLimitError extends ExecutionError {
    constructor(limitBytes: number, stepName: string);
}
