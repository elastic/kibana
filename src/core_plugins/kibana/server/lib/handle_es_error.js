import Boom from 'boom';
import _ from 'lodash';
import { errors as esErrors } from 'elasticsearch';

module.exports = function handleESError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  if (error instanceof esErrors.ConnectionFault ||
    error instanceof esErrors.ServiceUnavailable ||
    error instanceof esErrors.NoConnections ||
    error instanceof esErrors.RequestTimeout) {
    return Boom.serverTimeout(error);
  } else if (error instanceof esErrors.Conflict || _.contains(error.message, 'index_template_already_exists')) {
    return Boom.conflict(error);
  } else if (error instanceof esErrors[403]) {
    return Boom.forbidden(error);
  } else if (error instanceof esErrors.NotFound) {
    return Boom.notFound(error);
  } else if (error instanceof esErrors.BadRequest) {
    return Boom.badRequest(error);
  } else {
    return error;
  }
};
