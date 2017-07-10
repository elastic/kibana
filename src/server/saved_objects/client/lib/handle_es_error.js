import elasticsearch from 'elasticsearch';
import Boom from 'boom';
import { get } from 'lodash';

const {
  ConnectionFault,
  ServiceUnavailable,
  NoConnections,
  RequestTimeout,
  Conflict,
  403: Forbidden,
  NotFound,
  BadRequest
} = elasticsearch.errors;

export function isSingleTypeError(error) {
  if (!error) return;

  return error.type === 'illegal_argument_exception' &&
    error.reason.match(/the final mapping would have more than 1 type/);
}

export function handleEsError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason, type } = get(error, 'body.error', {});
  const message = error.message || reason;
  const details = { type, reason };

  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    throw Boom.serverTimeout();
  }

  if (error instanceof Conflict) {
    throw Boom.conflict(message, details);
  }

  if (error instanceof Forbidden) {
    throw Boom.forbidden(message, details);
  }

  if (error instanceof NotFound) {
    throw Boom.notFound(message, details);
  }

  if (error instanceof BadRequest) {
    if (isSingleTypeError(get(error, 'body.error'))) {
      details.type = 'is_single_type';
    }

    throw Boom.badRequest(message, details);
  }

  throw error;
}
