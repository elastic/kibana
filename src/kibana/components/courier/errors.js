define(function (require) {
  var _ = require('lodash');
  var module = require('modules').get('kibana/courier');
  var inherits = require('utils/inherits');

  var canStack = (function () {
      var err = new Error();
      return !!err.stack;
    }());

  module.service('couriersErrors', function () {
    var errors = this;

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
     * Request Failure - When an entire mutli request fails
     * @param {Error} err - the Error that came back
     * @param {Object} resp - optional HTTP response
     */
    errors.RequestFailure = function RequestFailure(err, resp) {
      CourierError.call(this,
        'Request to Elasticsearch failed: ' + JSON.stringify(resp || err.message),
        errors.RequestFailure);

      this.origError = err;
      this.resp = resp;
    };
    inherits(errors.RequestFailure, CourierError);

    /**
     * FetchFailure Error - when there is an error getting a doc or search within
     *  a multi-response response body
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
     * A doc was re-indexed but it was out of date.
     * @param {Object} resp - The response from es (one of the multi-response responses).
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
     * a field mapping was using a restricted fields name
     * @param {String} field - the fields which contains the conflict
     */
    errors.RestrictedMapping = function RestrictedMapping(field, index) {
      var msg = field + ' is a restricted field name';
      if (index) msg += ', found it while attempting to fetch mapping for index pattern: ' + index;

      CourierError.call(this,
        msg,
        errors.RestrictedMapping);
    };
    inherits(errors.RestrictedMapping, CourierError);

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

    /**
     * A saved object was not found
     * @param {String} field - the fields which contains the conflict
     */
    errors.SavedObjectNotFound = function SavedObjectNotFound(type) {
      CourierError.call(this,
        'Could not locate that ' + type,
        errors.SavedObjectNotFound);
    };
    inherits(errors.SavedObjectNotFound, CourierError);

  });
});