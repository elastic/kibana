import type { SerializedError } from '../../spec/schema';
export declare class ExecutionError extends Error {
    readonly type: string;
    readonly details?: Record<string, unknown>;
    constructor(params: SerializedError);
    /**
     * Creates an instance of ExecutionError from a standard Error.
     * @param error The standard Error to convert.
     * @returns An instance of ExecutionError.
     */
    static fromError(error: Error): ExecutionError;
    toSerializableObject(): SerializedError;
}
