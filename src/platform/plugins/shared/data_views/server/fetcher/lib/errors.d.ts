import Boom from '@hapi/boom';
/**
 *  Determines if an error is an elasticsearch error that's
 *  describing a failure caused by missing index/indices
 *  @param  err
 *  @return {Boolean}
 */
export declare function isEsIndexNotFoundError(err: unknown): boolean;
/**
 *  Creates an error that informs that no indices match the given pattern.
 *
 *  @param  {String} pattern the pattern which indexes were supposed to match
 *  @return {Boom}
 */
export declare function createNoMatchingIndicesError(pattern: string[] | string): Boom.Boom<unknown>;
/**
 *  Determines if an error is produced by `createNoMatchingIndicesError()`
 *
 *  @param  err
 *  @return {Boolean}
 */
export declare function isNoMatchingIndicesError(err: unknown): boolean;
/**
 *  Wrap "index_not_found_exception" errors in custom Boom errors
 *  automatically
 *  @param  {Array<String>|String} indices
 *  @param  {Boom.Boom|CustomHttpResponseOptions} error
 *  @return {Boom}
 */
export declare function convertEsError(indices: string[] | string, error: unknown): unknown;
