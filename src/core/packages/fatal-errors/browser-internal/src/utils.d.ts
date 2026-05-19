/**
 * Produce a string version of an error,
 */
export declare function formatError(error: string | Error, source?: string): string;
/**
 * Format the stack trace from a message so that it setups with the message, which
 * some browsers do automatically and some don't
 */
export declare function formatStack(error: string | Error): string;
