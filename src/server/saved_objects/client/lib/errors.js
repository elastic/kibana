import Boom from 'boom';

const code = Symbol('SavedObjectsClientErrorCode');

function decorate(error, errorCode, statusCode, message) {
  const boom = Boom.boomify(error, {
    statusCode,
    message,
    override: false,
  });

  boom[code] = errorCode;

  return boom;
}

// 400 - badRequest
const CODE_BAD_REQUEST = 'SavedObjectsClient/badRequest';
export function decorateBadRequestError(error, reason) {
  return decorate(error, CODE_BAD_REQUEST, 400, reason);
}
export function isBadRequestError(error) {
  return error && error[code] === CODE_BAD_REQUEST;
}


// 401 - Not Authorized
const CODE_NOT_AUTHORIZED = 'SavedObjectsClient/notAuthorized';
export function decorateNotAuthorizedError(error, reason) {
  return decorate(error, CODE_NOT_AUTHORIZED, 401, reason);
}
export function isNotAuthorizedError(error) {
  return error && error[code] === CODE_NOT_AUTHORIZED;
}


// 403 - Forbidden
const CODE_FORBIDDEN = 'SavedObjectsClient/forbidden';
export function decorateForbiddenError(error, reason) {
  return decorate(error, CODE_FORBIDDEN, 403, reason);
}
export function isForbiddenError(error) {
  return error && error[code] === CODE_FORBIDDEN;
}


// 404 - Not Found
const CODE_NOT_FOUND = 'SavedObjectsClient/notFound';
export function decorateNotFoundError(error, reason) {
  return decorate(error, CODE_NOT_FOUND, 404, reason);
}
export function isNotFoundError(error) {
  return error && error[code] === CODE_NOT_FOUND;
}


// 409 - Conflict
const CODE_CONFLICT = 'SavedObjectsClient/conflict';
export function decorateConflictError(error, reason) {
  return decorate(error, CODE_CONFLICT, 409, reason);
}
export function isConflictError(error) {
  return error && error[code] === CODE_CONFLICT;
}


// 500 - Es Unavailable
const CODE_ES_UNAVAILABLE = 'SavedObjectsClient/esUnavailable';
export function decorateEsUnavailableError(error, reason) {
  return decorate(error, CODE_ES_UNAVAILABLE, 503, reason);
}
export function isEsUnavailableError(error) {
  return error && error[code] === CODE_ES_UNAVAILABLE;
}


// 500 - General Error
const CODE_GENERAL_ERROR = 'SavedObjectsClient/generalError';
export function decorateGeneralError(error, reason) {
  return decorate(error, CODE_GENERAL_ERROR, 500, reason);
}
