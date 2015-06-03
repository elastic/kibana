define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var inherits = require('lodash').inherits;

  var canStack = (function () {
    var err = new Error();
    return !!err.stack;
  }());

  var errors = {};

  // abstract error class
  function KbnError(msg, constructor) {
    this.message = msg;

    Error.call(this, this.message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, constructor || KbnError);
    } else if (canStack) {
      this.stack = (new Error()).stack;
    } else {
      this.stack = '';
    }
  }
  errors.KbnError = KbnError;
  inherits(KbnError, Error);

  /**
   * HastyRefresh error class
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.HastyRefresh = function HastyRefresh() {
    KbnError.call(this,
      'Courier attempted to start a query before the previous had finished.',
      errors.HastyRefresh);
  };
  inherits(errors.HastyRefresh, KbnError);

  /**
   * SearchTimeout error class
   */
  errors.SearchTimeout = function SearchTimeout() {
    KbnError.call(this,
      'All or part of your request has timed out. The data shown may be incomplete.',
      errors.SearchTimeout);
  };
  inherits(errors.SearchTimeout, KbnError);

  /**
   * Request Failure - When an entire mutli request fails
   * @param {Error} err - the Error that came back
   * @param {Object} resp - optional HTTP response
   */
  errors.RequestFailure = function RequestFailure(err, resp) {
    err = err || false;

    KbnError.call(this,
      'Request to Elasticsearch failed: ' + angular.toJson(resp || err.message),
      errors.RequestFailure);

    this.origError = err;
    this.resp = resp;
  };
  inherits(errors.RequestFailure, KbnError);

  /**
   * FetchFailure Error - when there is an error getting a doc or search within
   *  a multi-response response body
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.FetchFailure = function FetchFailure(resp) {
    KbnError.call(this,
      'Failed to get the doc: ' + angular.toJson(resp),
      errors.FetchFailure);

    this.resp = resp;
  };
  inherits(errors.FetchFailure, KbnError);

  /**
   * ShardFailure Error - when one or more shards fail
   * @param {String} [msg] - An error message that will probably end up in a log.
   */
  errors.ShardFailure = function ShardFailure(resp) {
    KbnError.call(this, resp._shards.failed + ' of ' + resp._shards.total + ' shards failed.',
      errors.ShardFailure);

    this.resp = resp;
  };
  inherits(errors.ShardFailure, KbnError);


  /**
   * A doc was re-indexed but it was out of date.
   * @param {Object} resp - The response from es (one of the multi-response responses).
   */
  errors.VersionConflict = function VersionConflict(resp) {
    KbnError.call(this,
      'Failed to store document changes do to a version conflict.',
      errors.VersionConflict);

    this.resp = resp;
  };
  inherits(errors.VersionConflict, KbnError);


  /**
   * there was a conflict storing a doc
   * @param {String} field - the fields which contains the conflict
   */
  errors.MappingConflict = function MappingConflict(field) {
    KbnError.call(this,
      'Field "' + field + '" is defined with at least two different types in indices matching the pattern',
      errors.MappingConflict);
  };
  inherits(errors.MappingConflict, KbnError);

  /**
   * a field mapping was using a restricted fields name
   * @param {String} field - the fields which contains the conflict
   */
  errors.RestrictedMapping = function RestrictedMapping(field, index) {
    var msg = field + ' is a restricted field name';
    if (index) msg += ', found it while attempting to fetch mapping for index pattern: ' + index;

    KbnError.call(this, msg, errors.RestrictedMapping);
  };
  inherits(errors.RestrictedMapping, KbnError);

  /**
   * a non-critical cache write to elasticseach failed
   */
  errors.CacheWriteFailure = function CacheWriteFailure() {
    KbnError.call(this,
      'A Elasticsearch cache write has failed.',
      errors.CacheWriteFailure);
  };
  inherits(errors.CacheWriteFailure, KbnError);

  /**
   * when a field mapping is requested for an unknown field
   * @param {String} name - the field name
   */
  errors.FieldNotFoundInCache = function FieldNotFoundInCache(name) {
    KbnError.call(this,
      'The ' + name + ' field was not found in the cached mappings',
      errors.FieldNotFoundInCache);
  };
  inherits(errors.FieldNotFoundInCache, KbnError);

  /**
   * when a mapping already exists for a field the user is attempting to add
   * @param {String} name - the field name
   */
  errors.DuplicateField = function DuplicateField(name) {
    KbnError.call(this,
      'The "' + name + '" field already exists in this mapping',
      errors.DuplicateField);
  };
  inherits(errors.DuplicateField, KbnError);

  /**
   * A saved object was not found
   * @param {String} field - the fields which contains the conflict
   */
  errors.SavedObjectNotFound = function SavedObjectNotFound(type, id) {
    this.savedObjectType = type;
    this.savedObjectId = id;
    var idMsg = id ? ' (id: ' + id + ')' : '';
    KbnError.call(this,
      'Could not locate that ' + type + idMsg,
      errors.SavedObjectNotFound);
  };
  inherits(errors.SavedObjectNotFound, KbnError);

  /**
   * Tried to call a method that relies on SearchSource having an indexPattern assigned
   */
  errors.IndexPatternMissingIndices = function IndexPatternMissingIndices(type) {
    KbnError.call(this,
      'IndexPattern\'s configured pattern does not match any indices',
      errors.IndexPatternMissingIndices);
  };
  inherits(errors.IndexPatternMissingIndices, KbnError);

  /**
   * Tried to call a method that relies on SearchSource having an indexPattern assigned
   */
  errors.NoDefinedIndexPatterns = function NoDefinedIndexPatterns(type) {
    KbnError.call(this,
      'Define at least one index pattern to continue',
      errors.NoDefinedIndexPatterns);
  };
  inherits(errors.NoDefinedIndexPatterns, KbnError);


  /**
   * Tried to load a route besides settings/indices but you don't have a default index pattern!
   */
  errors.NoDefaultIndexPattern = function NoDefaultIndexPattern(type) {
    KbnError.call(this,
      'Please specify a default index pattern',
      errors.NoDefaultIndexPattern);
  };
  inherits(errors.NoDefaultIndexPattern, KbnError);


  /**
   * user with the vislib, when the container is too small
   * @param {String} message - the message to provide with the error
   */
  errors.ContainerTooSmall = function ContainerTooSmall() {
    KbnError.call(this,
    'This container is too small to render the visualization',
    errors.ContainerTooSmall);
  };
  inherits(errors.ContainerTooSmall, KbnError);

  /**
   * error thrown when user tries to render an chart with less
   * than the required number of data points
   * @param {String} message - the message to provide with the error
   */
  errors.NotEnoughData = function NotEnoughData(message) {
    KbnError.call(this, message, errors.NotEnoughData);
  };
  inherits(errors.NotEnoughData, KbnError);

  /**
   * error thrown when no results are returned from an elasticsearch query
   */
  errors.NoResults = function NoResults() {
    KbnError.call(this,
    'No results found',
    errors.NoResults);
  };
  inherits(errors.NoResults, KbnError);

  /**
   * error thrown when no results are returned from an elasticsearch query
   */
  errors.PieContainsAllZeros = function PieContainsAllZeros() {
    KbnError.call(this,
      'No results displayed because all values equal 0',
      errors.PieContainsAllZeros);
  };
  inherits(errors.PieContainsAllZeros, KbnError);

  /**
   * error thrown when no results are returned from an elasticsearch query
   */
  errors.InvalidLogScaleValues = function InvalidLogScaleValues() {
    KbnError.call(this,
      'Values less than 1 cannot be displayed on a log scale',
      errors.InvalidLogScaleValues);
  };
  inherits(errors.InvalidLogScaleValues, KbnError);

  /** error thrown when wiggle chart is selected for non linear data */
  errors.InvalidWiggleSelection = function InvalidWiggleSelection() {
    KbnError.call(this,
      'In wiggle mode the area chart requires ordered values on the x-axis. Try using a Histogram or Date Histogram aggregation.',
      errors.InvalidWiggleSelection);
  };
  inherits(errors.InvalidWiggleSelection, KbnError);

  return errors;
});
