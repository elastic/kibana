import elasticsearch from 'elasticsearch';
import Boom from 'boom';

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

  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    throw Boom.serverTimeout();
  }

  if (error instanceof Conflict || error.message.includes('index_template_already_exists')) {
    throw Boom.conflict(error);
  }

  if (error instanceof Forbidden) {
    throw Boom.forbidden();
  }

  if (error instanceof NotFound) {
    throw Boom.notFound();
  }

  if (error instanceof BadRequest) {
    throw Boom.badRequest();
  }

  throw error;
}
