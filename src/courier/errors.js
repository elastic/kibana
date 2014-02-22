define(function (require) {
  var listenerCount = require('utils/event_emitter').listenerCount;
  var _ = require('lodash');
  var errors = {};
  var inherits = require('utils/inherits');

  var canStack = (function () {
    var err = new Error();
    return !!err.stack;
  }());

  // abstract error class
  function CourierError(msg, constructor) {
    this.message = msg;

    Error.call(this, this.message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, constructor || CourierError);
    } else if (canStack) {
      this.stack = (new Error()).stack;
    } else {
      this.stack = '';
    }
  }
  errors.CourierError = CourierError;
  inherits(CourierError, Error);

  /**
   * HastyRefresh error class
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.HastyRefresh = function HastyRefresh() {
    CourierError.call(this,
      'Courier attempted to start a query before the previous had finished.',
      errors.HastyRefresh);
  };
  inherits(errors.HastyRefresh, CourierError);

  /**
   * DocFetchFailure Error - where there is an error getting a doc
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.DocFetchFailure = function DocFetchFailure(resp) {
    CourierError.call(this,
      'Failed to get the doc: ' + JSON.stringify(resp),
      errors.DocFetchFailure);

    this.resp = resp;
  };
  inherits(errors.DocFetchFailure, CourierError);

  /**
   * Connection Error
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.VersionConflict = function VersionConflict(resp) {
    CourierError.call(this,
      'Failed to store document changes do to a version conflict.',
      errors.VersionConflict);

    this.resp = resp;
  };
  inherits(errors.VersionConflict, CourierError);

  return errors;
});