import type * as t from 'io-ts';
import type { Either } from 'fp-ts/Either';
/**
 * Given an original object and a decoded object this will return an error
 * if and only if the original object has additional keys that the decoded
 * object does not have. If the original decoded already has an error, then
 * this will return the error as is and not continue.
 *
 * NOTE: You MUST use t.exact(...) for this to operate correctly as your schema
 * needs to remove additional keys before the compare
 *
 * You might not need this in the future if the below issue is solved:
 * https://github.com/gcanti/io-ts/issues/322
 *
 * @param original The original to check if it has additional keys
 * @param decoded The decoded either which has either an existing error or the
 * decoded object which could have additional keys stripped from it.
 */
export declare const exactCheck: <T>(original: unknown, decoded: Either<t.Errors, T>) => Either<t.Errors, T>;
export declare const findDifferencesRecursive: <T>(original: unknown, decodedValue: T) => string[];
