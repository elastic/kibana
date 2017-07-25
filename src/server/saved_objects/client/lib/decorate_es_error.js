import elasticsearch from 'elasticsearch';
import { get } from 'lodash';

const {
  ConnectionFault,
  ServiceUnavailable,
  NoConnections,
  RequestTimeout,
  Conflict,
  401: NotAuthorized,
  403: Forbidden,
  NotFound,
  BadRequest
} = elasticsearch.errors;

import {
  wrapBadRequestError,
  wrapNotAuthorizedError,
  wrapForbiddenError,
  wrapNotFoundError,
  wrapConflictError,
  wrapEsUnavailableError,
  wrapGeneralError,
} from './errors';

export function decorateEsError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason } = get(error, 'body.error', {});
  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    return wrapEsUnavailableError(error, reason);
  }

  if (error instanceof Conflict) {
    return wrapConflictError(error, reason);
  }

  if (error instanceof NotAuthorized) {
    return wrapNotAuthorizedError(error, reason);
  }

  if (error instanceof Forbidden) {
    return wrapForbiddenError(error, reason);
  }

  if (error instanceof NotFound) {
    return wrapNotFoundError(error, reason);
  }

  if (error instanceof BadRequest) {
    return wrapBadRequestError(error, reason);
  }

  return wrapGeneralError(error, reason);
}
