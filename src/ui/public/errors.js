import _ from 'lodash';
import angular from 'angular';

const canStack = (function () {
  const err = new Error();
  return !!err.stack;
}());

// abstract error class
export function KbnError(msg, constructor) {
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
_.class(KbnError).inherits(Error);

/**
 * If the error permits, propagate the error to be rendered on screen
 */
KbnError.prototype.displayToScreen = function () {
  throw this;
};

/**
 * HastyRefresh error class
 */
export function HastyRefresh() {
  KbnError.call(this,
    'Courier attempted to start a query before the previous had finished.',
    HastyRefresh);
}
_.class(HastyRefresh).inherits(KbnError);

/**
 * SearchTimeout error class
 */
export function SearchTimeout() {
  KbnError.call(this,
    'All or part of your request has timed out. The data shown may be incomplete.',
    SearchTimeout);
}
_.class(SearchTimeout).inherits(KbnError);

/**
 * Request Failure - When an entire mutli request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export function RequestFailure(err, resp) {
  err = err || false;

  KbnError.call(this,
    'Request to Elasticsearch failed: ' + angular.toJson(resp || err.message),
    RequestFailure);

  this.origError = err;
  this.resp = resp;
}
_.class(RequestFailure).inherits(KbnError);

/**
 * FetchFailure Error - when there is an error getting a doc or search within
 *  a multi-response response body
 * @param {Object} resp - The response from es.
 */
export function FetchFailure(resp) {
  KbnError.call(this,
    'Failed to get the doc: ' + angular.toJson(resp),
    FetchFailure);

  this.resp = resp;
}
_.class(FetchFailure).inherits(KbnError);

/**
 * ShardFailure Error - when one or more shards fail
 * @param {Object} resp - The response from es.
 */
export function ShardFailure(resp) {
  KbnError.call(this, resp._shards.failed + ' of ' + resp._shards.total + ' shards failed.',
    ShardFailure);

  this.resp = resp;
}
_.class(ShardFailure).inherits(KbnError);


/**
 * A doc was re-indexed but it was out of date.
 * @param {Object} resp - The response from es (one of the multi-response responses).
 */
export function VersionConflict(resp) {
  KbnError.call(this,
    'Failed to store document changes do to a version conflict.',
    VersionConflict);

  this.resp = resp;
}
_.class(VersionConflict).inherits(KbnError);


/**
 * there was a conflict storing a doc
 * @param {String} field - the fields which contains the conflict
 */
export function MappingConflict(field) {
  KbnError.call(this,
    'Field "' + field + '" is defined with at least two different types in indices matching the pattern',
    MappingConflict);
}
_.class(MappingConflict).inherits(KbnError);

/**
 * a field mapping was using a restricted fields name
 * @param {String} field - the fields which contains the conflict
 */
export function RestrictedMapping(field, index) {
  let msg = field + ' is a restricted field name';
  if (index) msg += ', found it while attempting to fetch mapping for index pattern: ' + index;

  KbnError.call(this, msg, RestrictedMapping);
}
_.class(RestrictedMapping).inherits(KbnError);

/**
 * a non-critical cache write to elasticseach failed
 */
export function CacheWriteFailure() {
  KbnError.call(this,
    'A Elasticsearch cache write has failed.',
    CacheWriteFailure);
}
_.class(CacheWriteFailure).inherits(KbnError);

/**
 * when a field mapping is requested for an unknown field
 * @param {String} name - the field name
 */
export function FieldNotFoundInCache(name) {
  KbnError.call(this,
    'The ' + name + ' field was not found in the cached mappings',
    FieldNotFoundInCache);
}
_.class(FieldNotFoundInCache).inherits(KbnError);

/**
 * when a mapping already exists for a field the user is attempting to add
 * @param {String} name - the field name
 */
export function DuplicateField(name) {
  KbnError.call(this,
    'The "' + name + '" field already exists in this mapping',
    DuplicateField);
}
_.class(DuplicateField).inherits(KbnError);

/**
 * A saved object was not found
 */
export function SavedObjectNotFound(type, id) {
  this.savedObjectType = type;
  this.savedObjectId = id;
  const idMsg = id ? ' (id: ' + id + ')' : '';
  KbnError.call(this,
    'Could not locate that ' + type + idMsg,
    SavedObjectNotFound);
}
_.class(SavedObjectNotFound).inherits(KbnError);

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export function IndexPatternMissingIndices() {
  KbnError.call(this,
    'IndexPattern\'s configured pattern does not match any indices',
    IndexPatternMissingIndices);
}
_.class(IndexPatternMissingIndices).inherits(KbnError);

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export function NoDefinedIndexPatterns() {
  KbnError.call(this,
    'Define at least one index pattern to continue',
    NoDefinedIndexPatterns);
}
_.class(NoDefinedIndexPatterns).inherits(KbnError);

/**
 * Tried to load a route besides management/kibana/index but you don't have a default index pattern!
 */
export function NoDefaultIndexPattern() {
  KbnError.call(this,
    'Please specify a default index pattern',
    NoDefaultIndexPattern);
}
_.class(NoDefaultIndexPattern).inherits(KbnError);

export function PersistedStateError() {
  KbnError.call(this,
    'Error with the persisted state',
    PersistedStateError);
}
_.class(PersistedStateError).inherits(KbnError);

/**
 * UI Errors
 */
export class VislibError extends KbnError {
  constructor(message) {
    super(message);
  }

  displayToScreen(handler) {
    handler.error(this.message);
  }
}

export class ContainerTooSmall extends VislibError {
  constructor() {
    super('This container is too small to render the visualization');
  }
}

export class InvalidWiggleSelection extends VislibError {
  constructor() {
    super('In wiggle mode the area chart requires ordered values on the x-axis. Try using a Histogram or Date Histogram aggregation.');
  }
}

export class PieContainsAllZeros extends VislibError {
  constructor() {
    super('No results displayed because all values equal 0.');
  }
}

export class InvalidLogScaleValues extends VislibError {
  constructor() {
    super('Values less than 1 cannot be displayed on a log scale');
  }
}

export class StackedBarChartConfig extends VislibError {
  constructor(message) {
    super(message);
  }
}

/**
 * error thrown when user tries to render an chart with less
 * than the required number of data points
 * @param {String} message - the message to provide with the error
 */
export class NotEnoughData extends VislibError {
  constructor(message) {
    super(message);
  }
}

export class NoResults extends VislibError {
  constructor() {
    super('No results found');
  }
}
