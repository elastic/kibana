/**
 * The fatal error info.
 *
 * @public
 */
export interface FatalError<T extends Error | string = Error | string> {
    /**
     * The error to display.
     */
    error: T;
    /**
     * A prefix to the error message.
     */
    source?: string;
}
