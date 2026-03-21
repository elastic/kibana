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
 * Returns the byte count on success, or -1 if the value is not serializable
 * (e.g., streams, circular references, functions).
 */
export declare function safeOutputSize(output: unknown): number;
/**
 * Error thrown when a step's response or output exceeds the configured size limit.
 * Used by both Layer 1 (pre-emptive I/O enforcement) and Layer 2 (base class output guard).
 */
export declare class ResponseSizeLimitError extends ExecutionError {
    constructor(limitBytes: number, stepName: string);
}
