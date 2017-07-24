import {
  isBadRequestError,
  isNotAuthorizedError,
  isForbiddenError,
  isNotFoundError,
  isConflictError,
  isEsUnavailableError
} from './error_types';

export const errorTypeHelpers = {
  isBadRequestError,
  isNotAuthorizedError,
  isForbiddenError,
  isNotFoundError,
  isConflictError,
  isEsUnavailableError,
};
