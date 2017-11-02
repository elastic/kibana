import Boom from 'boom';
import { get } from 'lodash';


const ERR_ES_INDEX_NOT_FOUND = 'index_not_found_exception';
const ERR_ES_ILLEGAL_ARG = 'illegal_argument_exception';

export function isEsIndexNotFoundError(err) {
  return get(err, ['body', 'error', 'type']) === ERR_ES_INDEX_NOT_FOUND;
}

export function isEsIllegalArgumentError(err) {
  return get(err, ['body', 'error', 'type']) === ERR_ES_ILLEGAL_ARG;
}

export function convertEsError(error) {
  const message = error.body ? error.body.error.reason : undefined;
  if (isEsIndexNotFoundError(error)) {
    return Boom.notFound(message, error);
  } else if (isEsIllegalArgumentError(error)) {
    return Boom.badRequest(message, error);
  }

  const statusCode = error.statusCode;
  if (!error.message) {
    error.message = message;
  }
  return Boom.wrap(error, statusCode, message);
}
