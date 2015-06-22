var _ = require('./utils');
var errors = module.exports;

var canCapture = (typeof Error.captureStackTrace === 'function');
var canStack = !!(new Error()).stack;

function ErrorAbstract(msg, constructor) {
  this.message = msg;

  Error.call(this, this.message);

  if (canCapture) {
    Error.captureStackTrace(this, constructor);
  }
  else if (canStack) {
    this.stack = (new Error()).stack;
  }
  else {
    this.stack = '';
  }
}
errors._Abstract = ErrorAbstract;
_.inherits(ErrorAbstract, Error);

/**
 * Connection Error
 * @param {String} [msg] - An error message that will probably end up in a log.
 */
errors.ConnectionFault = function ConnectionFault(msg) {
  ErrorAbstract.call(this, msg || 'Connection Failure', errors.ConnectionFault);
};
_.inherits(errors.ConnectionFault, ErrorAbstract);

/**
 * No Living Connections
 * @param {String} [msg] - An error message that will probably end up in a log.
 */
errors.NoConnections = function NoConnections(msg) {
  ErrorAbstract.call(this, msg || 'No Living connections', errors.NoConnections);
};
_.inherits(errors.NoConnections, ErrorAbstract);

/**
 * Generic Error
 * @param {String} [msg] - An error message that will probably end up in a log.
 */
errors.Generic = function Generic(msg) {
  ErrorAbstract.call(this, msg || 'Generic Error', errors.Generic);
};
_.inherits(errors.Generic, ErrorAbstract);

/**
 * Request Timeout Error
 * @param {String} [msg] - An error message that will probably end up in a log.
 */
errors.RequestTimeout = function RequestTimeout(msg) {
  ErrorAbstract.call(this, msg || 'Request Timeout', errors.RequestTimeout);
};
_.inherits(errors.RequestTimeout, ErrorAbstract);


/**
 * Request Body could not be parsed
 * @param {String} [msg] - An error message that will probably end up in a log.
 */
errors.Serialization = function Serialization(msg) {
  ErrorAbstract.call(this, msg || 'Unable to parse/serialize body', errors.Serialization);
};
_.inherits(errors.Serialization, ErrorAbstract);


/**
 * Thrown when a browser compatability issue is detected (cough, IE, cough)
 */
errors.RequestTypeError = function RequestTypeError(feature) {
  ErrorAbstract.call(this, 'Cross-domain AJAX requests ' + feature + ' are not supported', errors.RequestTypeError);
};
_.inherits(errors.RequestTypeError, ErrorAbstract);

var statusCodes = {

  /**
   * GatewayTimeout
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  504: 'Gateway Timeout',

  /**
   * ServiceUnavailable
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  503: 'Service Unavailable',

  /**
   * InternalServerError
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  500: 'Internal Server Error',

  /**
   * PreconditionFailed
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  412: 'Precondition Failed',

  /**
   * Conflict
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  409: 'Conflict',

  /**
   * AuthorizationException
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  403: 'Authorization Exception',

  /**
   * NotFound
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  404: 'Not Found',

  /**
   * AuthenticationException
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  401: 'Authentication Exception',

  /**
   * BadRequest
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  400: 'Bad Request',

  /**
   * MovedPermanently
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  301: 'Moved Permanently'
};

_.each(statusCodes, function (name, status) {
  var className = _.studlyCase(name);

  function StatusCodeError(msg) {
    ErrorAbstract.call(this, msg || name, StatusCodeError);
  }

  _.inherits(StatusCodeError, ErrorAbstract);
  errors[className] = StatusCodeError;
  errors[status] = StatusCodeError;
});