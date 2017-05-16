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

export function handleEsError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const reason = get(error, 'body.error.reason');

  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    throw Boom.serverTimeout();
  }

  if (error instanceof Conflict) {
    throw Boom.conflict(reason);
  }

  if (error instanceof Forbidden) {
    throw Boom.forbidden(reason);
  }

  if (error instanceof NotFound) {
    throw Boom.notFound(reason);
  }

  if (error instanceof BadRequest) {
    throw Boom.badRequest(reason);
  }

  throw error;
}
