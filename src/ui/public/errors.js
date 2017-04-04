import angular from 'angular';
import _ from 'lodash';

const canStack = (function () {
  const err = new Error();
  return !!err.stack;
}());

// abstract error class
export class KbnError {
  constructor(msg, constructor) {
    this.message = msg;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, constructor || KbnError);
    } else if (canStack) {
      this.stack = (new Error()).stack;
    } else {
      this.stack = '';
    }
  }

  /**
   * If the error permits, propagate the error to be rendered on screen
   */
  displayToScreen() {
    throw this;
  }
}
// Note, you can't extend the built in Error class:
// http://stackoverflow.com/questions/33870684/why-doesnt-instanceof-work-on-instances-of-error-subclasses-under-babel-node
// Hence we are inheriting from it this way, instead of using extends Error, and this will then preserve
// instanceof checks.
_.class(KbnError).inherits(Error);

/**
 * SearchTimeout error class
 */
export class SearchTimeout extends KbnError {
  constructor() {
    super('All or part of your request has timed out. The data shown may be incomplete.',
          SearchTimeout);
  }
}

/**
 * Request Failure - When an entire mutli request fails
 * @param {Error} err - the Error that came back
 * @param {Object} resp - optional HTTP response
 */
export class RequestFailure extends KbnError {
  constructor(err, resp) {
    err = err || false;
    super(`Request to Elasticsearch failed: ${angular.toJson(resp || err.message)}`,
          RequestFailure);

    this.origError = err;
    this.resp = resp;
  }
}

/**
 * FetchFailure Error - when there is an error getting a doc or search within
 *  a multi-response response body
 * @param {Object} resp - The response from es.
 */
export class FetchFailure extends KbnError {
  constructor(resp) {
    super(
      `Failed to get the doc: ${angular.toJson(resp)}`,
      FetchFailure);

    this.resp = resp;
  }
}

/**
 * ShardFailure Error - when one or more shards fail
 * @param {Object} resp - The response from es.
 */
export class ShardFailure extends KbnError {
  constructor(resp) {
    super(
      `${resp._shards.failed} of ${resp._shards.total} shards failed.`,
      ShardFailure);

    this.resp = resp;
  }
}

/**
 * A doc was re-indexed but it was out of date.
 * @param {Object} resp - The response from es (one of the multi-response responses).
 */
export class VersionConflict extends KbnError {
  constructor(resp) {
    super(
      'Failed to store document changes do to a version conflict.',
      VersionConflict);

    this.resp = resp;
  }
}

/**
 * there was a conflict storing a doc
 * @param {String} field - the fields which contains the conflict
 */
export class MappingConflict extends KbnError {
  constructor(field) {
    super(
      `Field "${field}" is defined with at least two different types in indices matching the pattern`,
      MappingConflict);
  }
}

/**
 * a field mapping was using a restricted fields name
 * @param {String} field - the fields which contains the conflict
 */
export class RestrictedMapping extends KbnError {
  constructor(field, index) {
    let msg = `"${field}" is a restricted field name`;
    if (index) msg += `, found it while attempting to fetch mapping for index pattern: ${index}`;

    super(msg, RestrictedMapping);
  }
}

/**
 * a non-critical cache write to elasticseach failed
 */
export class CacheWriteFailure extends KbnError {
  constructor() {
    super(
      'A Elasticsearch cache write has failed.',
      CacheWriteFailure);
  }
}

/**
 * when a field mapping is requested for an unknown field
 * @param {String} name - the field name
 */
export class FieldNotFoundInCache extends KbnError {
  constructor(name) {
    super(
      `The "${name}" field was not found in the cached mappings`,
      FieldNotFoundInCache);
  }
}

/**
 * when a mapping already exists for a field the user is attempting to add
 * @param {String} name - the field name
 */
export class DuplicateField extends KbnError {
  constructor(name) {
    super(
      `The field "${name}" already exists in this mapping`,
      DuplicateField);
  }
}

/**
 * A saved object was not found
 */
export class SavedObjectNotFound extends KbnError {
  constructor(type, id) {
    const idMsg = id ? ` (id: ${id})` : '';
    super(
      `Could not locate that ${type}${idMsg}`,
      SavedObjectNotFound);

    this.savedObjectType = type;
    this.savedObjectId = id;
  }
}

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class IndexPatternMissingIndices extends KbnError {
  constructor(message) {
    const defaultMessage = 'IndexPattern\'s configured pattern does not match any indices';

    super(
      (message && message.length) ? `No matching indices found: ${message}` : defaultMessage,
      IndexPatternMissingIndices);
  }
}

/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export class NoDefinedIndexPatterns extends KbnError {
  constructor() {
    super(
      'Define at least one index pattern to continue',
      NoDefinedIndexPatterns);
  }
}

/**
 * Tried to load a route besides management/kibana/index but you don't have a default index pattern!
 */
export class NoDefaultIndexPattern extends KbnError {
  constructor() {
    super(
      'Please specify a default index pattern',
      NoDefaultIndexPattern);
  }
}

export class PersistedStateError extends KbnError {
  constructor() {
    super(
      'Error with the persisted state',
      PersistedStateError);
  }
}

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
