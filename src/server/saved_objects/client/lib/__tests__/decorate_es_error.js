import expect from 'expect.js';
import { errors as esErrors } from 'elasticsearch';

import { decorateEsError } from '../decorate_es_error';
import {
  isEsUnavailableError,
  isConflictError,
  isNotAuthorizedError,
  isForbiddenError,
  isNotFoundError,
  isBadRequestError,
} from '../errors';

describe('savedObjectsClient/decorateEsError', () => {
  it('always returns the same error it receives', () => {
    const error = new Error();
    expect(decorateEsError(error)).to.be(error);
  });

  it('makes es.ConnectionFault a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ConnectionFault();
    expect(isEsUnavailableError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isEsUnavailableError(error)).to.be(true);
  });

  it('makes es.ServiceUnavailable a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.ServiceUnavailable();
    expect(isEsUnavailableError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isEsUnavailableError(error)).to.be(true);
  });

  it('makes es.NoConnections a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.NoConnections();
    expect(isEsUnavailableError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isEsUnavailableError(error)).to.be(true);
  });

  it('makes es.RequestTimeout a SavedObjectsClient/EsUnavailable error', () => {
    const error = new esErrors.RequestTimeout();
    expect(isEsUnavailableError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isEsUnavailableError(error)).to.be(true);
  });

  it('makes es.Conflict a SavedObjectsClient/Conflict error', () => {
    const error = new esErrors.Conflict();
    expect(isConflictError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isConflictError(error)).to.be(true);
  });

  it('makes es.AuthenticationException a SavedObjectsClient/NotAuthorized error', () => {
    const error = new esErrors.AuthenticationException();
    expect(isNotAuthorizedError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isNotAuthorizedError(error)).to.be(true);
  });

  it('makes es.Forbidden a SavedObjectsClient/Forbidden error', () => {
    const error = new esErrors.Forbidden();
    expect(isForbiddenError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isForbiddenError(error)).to.be(true);
  });

  it('discards es.NotFound errors and returns a generic NotFound error', () => {
    const error = new esErrors.NotFound();
    expect(isNotFoundError(error)).to.be(false);
    const genericError = decorateEsError(error);
    expect(genericError).to.not.be(error);
    expect(isNotFoundError(error)).to.be(false);
    expect(isNotFoundError(genericError)).to.be(true);
  });

  it('makes es.BadRequest a SavedObjectsClient/BadRequest error', () => {
    const error = new esErrors.BadRequest();
    expect(isBadRequestError(error)).to.be(false);
    expect(decorateEsError(error)).to.be(error);
    expect(isBadRequestError(error)).to.be(true);
  });

  it('returns other errors as Boom errors', () => {
    const error = new Error();
    expect(error).to.not.have.property('isBoom');
    expect(decorateEsError(error)).to.be(error);
    expect(error).to.have.property('isBoom');
  });
});
