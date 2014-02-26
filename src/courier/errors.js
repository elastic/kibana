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
   * FetchFailure Error - where there is an error getting a doc
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.FetchFailure = function FetchFailure(resp) {
    CourierError.call(this,
      'Failed to get the doc: ' + JSON.stringify(resp),
      errors.FetchFailure);

    this.resp = resp;
  };
  inherits(errors.FetchFailure, CourierError);


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


  /**
   * there was a conflict storing a doc
   * @param {String} field - the fields which contains the conflict
   */
  errors.MappingConflict = function MappingConflict(field) {
    CourierError.call(this,
      'Field ' + field + ' is defined as at least two different types in indices matching the pattern',
      errors.MappingConflict);
  };
  inherits(errors.MappingConflict, CourierError);

  /**
   * a non-critical cache write to elasticseach failed
   */
  errors.CacheWriteFailure = function CacheWriteFailure() {
    CourierError.call(this,
      'A Elasticsearch cache write has failed.',
      errors.CacheWriteFailure);
  };
  inherits(errors.CacheWriteFailure, CourierError);

  /**
   * when a field mapping is requested for an unknown field
   * @param {String} name - the field name
   */
  errors.FieldNotFoundInCache = function FieldNotFoundInCache(name) {
    CourierError.call(this,
      'The ' + name + ' field was not found in the cached mappings',
      errors.FieldNotFoundInCache);
  };
  inherits(errors.FieldNotFoundInCache, CourierError);

  return errors;
});