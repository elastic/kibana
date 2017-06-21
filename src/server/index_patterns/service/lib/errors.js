import Boom from 'boom';
import { get } from 'lodash';

const ERR_ES_INDEX_NOT_FOUND = 'index_not_found_exception';
const ERR_NO_MATCHING_INDICES = 'no_matching_indices';

/**
 *  Determines if an error is an elasticsearch error that's
 *  describing a failure caused by missing index/indices
 *  @param  {Any}  err
 *  @return {Boolean}
 */
export function isEsIndexNotFoundError(err) {
  return get(err, ['body', 'error', 'type']) === ERR_ES_INDEX_NOT_FOUND;
}

/**
 *  Creates an error that informs that no indices match the given pattern.
 *
 *  @param  {String} pattern the pattern which indexes were supposed to match
 *  @return {Boom}
 */
export function createNoMatchingIndicesError(pattern) {
  const err = Boom.notFound(`No indices match pattern "${pattern}"`);
  err.output.payload.code = ERR_NO_MATCHING_INDICES;
  return err;
}

/**
 *  Determins if an error is produced by `createNoMatchingIndicesError()`
 *
 *  @param  {Any} err
 *  @return {Boolean}
 */
export function isNoMatchingIndicesError(err) {
  return get(err, ['output', 'payload', 'code']) === ERR_NO_MATCHING_INDICES;
}

/**
 *  Wrap "index_not_found_exception" errors in custom Boom errors
 *  automatically
 *  @param  {[type]} indices [description]
 *  @return {[type]}         [description]
 */
export function convertEsError(indices, error) {
  if (isEsIndexNotFoundError(error)) {
    return createNoMatchingIndicesError(indices);
  }

  const statusCode = error.statusCode;
  const message = error.body ? error.body.error : undefined;
  return Boom.wrap(error, statusCode, message);
}
