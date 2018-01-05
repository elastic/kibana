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
  decorateBadRequestError,
  decorateNotAuthorizedError,
  decorateForbiddenError,
  createGenericNotFoundError,
  decorateConflictError,
  decorateEsUnavailableError,
  decorateGeneralError,
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
    return decorateEsUnavailableError(error, reason);
  }

  if (error instanceof Conflict) {
    return decorateConflictError(error, reason);
  }

  if (error instanceof NotAuthorized) {
    return decorateNotAuthorizedError(error, reason);
  }

  if (error instanceof Forbidden) {
    return decorateForbiddenError(error, reason);
  }

  if (error instanceof NotFound) {
    return createGenericNotFoundError();
  }

  if (error instanceof BadRequest) {
    return decorateBadRequestError(error, reason);
  }

  return decorateGeneralError(error, reason);
}
