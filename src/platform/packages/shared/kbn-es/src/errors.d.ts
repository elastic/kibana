interface CliError extends Error {
    isCliError: boolean;
}
export declare function createCliError(message: string): Error & {
    isCliError: boolean;
};
export declare function isCliError(error: unknown): error is CliError;
export {};
