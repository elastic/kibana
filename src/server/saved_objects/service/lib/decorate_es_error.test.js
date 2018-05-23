import { errors as esErrors } from 'elasticsearch';

import { decorateEsError } from './decorate_es_error';
import {
  isEsUnavailableError,
  isConflictError,
  isNotAuthorizedError,
  isForbiddenError,
  isNotFoundError,
  isBadRequestError,
} from './errors';

describe('savedObjectsClient/decorateEsError', () => {
  it('always returns the same error it receives', () => {
    const error = new Error();
    expect(decorateEsError(error)).toBe(error);
  });

  it('makes es.ConnectionFault a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ConnectionFault();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.ServiceUnavailable a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ServiceUnavailable();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.NoConnections a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.NoConnections();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.RequestTimeout a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.RequestTimeout();
    expect(isEsUnavailableError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isEsUnavailableError(error)).toBe(true);
  });

  it('makes es.Conflict a SavedObjectsClient/Conflict error', () => {
    const error = new esErrors.Conflict();
    expect(isConflictError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isConflictError(error)).toBe(true);
  });

  it('makes es.AuthenticationException a SavedObjectsClient/NotAuthorized error', () => {
    const error = new esErrors.AuthenticationException();
    expect(isNotAuthorizedError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isNotAuthorizedError(error)).toBe(true);
  });

  it('makes es.Forbidden a SavedObjectsClient/Forbidden error', () => {
    const error = new esErrors.Forbidden();
    expect(isForbiddenError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isForbiddenError(error)).toBe(true);
  });

  it('discards es.NotFound errors and returns a generic NotFound error', () => {
    const error = new esErrors.NotFound();
    expect(isNotFoundError(error)).toBe(false);
    const genericError = decorateEsError(error);
    expect(genericError).not.toBe(error);
    expect(isNotFoundError(error)).toBe(false);
    expect(isNotFoundError(genericError)).toBe(true);
  });

  it('makes es.BadRequest a SavedObjectsClient/BadRequest error', () => {
    const error = new esErrors.BadRequest();
    expect(isBadRequestError(error)).toBe(false);
    expect(decorateEsError(error)).toBe(error);
    expect(isBadRequestError(error)).toBe(true);
  });

  it('returns other errors as Boom errors', () => {
    const error = new Error();
    expect(error).not.toHaveProperty('isBoom');
    expect(decorateEsError(error)).toBe(error);
    expect(error).toHaveProperty('isBoom');
  });
});
