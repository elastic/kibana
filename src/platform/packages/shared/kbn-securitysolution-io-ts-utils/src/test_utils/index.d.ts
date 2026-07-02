import type * as t from 'io-ts';
interface Message<T> {
    errors: t.Errors;
    schema: T | {};
}
export declare const foldLeftRight: <T>(ma: import("fp-ts/Either").Either<t.Errors, unknown>) => Message<unknown>;
/**
 * Convenience utility to keep the error message handling within tests to be
 * very concise.
 * @param validation The validation to get the errors from
 */
export declare const getPaths: <A>(validation: t.Validation<A>) => string[];
/**
 * Convenience utility to remove text appended to links by EUI
 */
export declare const removeExternalLinkText: (str: string) => string;
export {};
