define(function (require) {
  var listenerCount = require('utils/event_emitter').listenerCount;
  var errors = {};

  // caused by a refresh attempting to start before the prevous is done
  function HastyRefresh() {
    this.name = 'HastyRefresh';
    this.message = 'Courier attempted to start a query before the previous had finished.';
  }
  HastyRefresh.prototype = new Error();
  HastyRefresh.prototype.constructor = HastyRefresh;
  errors.HastyRefresh = HastyRefresh;

  // a non-critical cache write to elasticseach failed
  function CacheWriteFailure() {
    this.name = 'CacheWriteFailure';
    this.message = 'A Elasticsearch cache write has failed.';
  }
  CacheWriteFailure.prototype = new Error();
  CacheWriteFailure.prototype.constructor = CacheWriteFailure;
  errors.CacheWriteFailure = CacheWriteFailure;

  // when a field mapping is requested for an unknown field
  function FieldNotFoundInCache(name) {
    this.name = 'FieldNotFoundInCache';
    this.message = 'The ' + name + ' field was not found in the cached mappings';
  }
  FieldNotFoundInCache.prototype = new Error();
  FieldNotFoundInCache.prototype.constructor = FieldNotFoundInCache;
  errors.FieldNotFoundInCache = FieldNotFoundInCache;

  // where there is an error getting a doc
  function DocFetchFailure(resp) {
    this.name = 'DocFetchFailure';
    this.resp = resp;
    this.message = 'Failed to get the doc: ' + JSON.stringify(resp);
  }
  DocFetchFailure.prototype = new Error();
  DocFetchFailure.prototype.constructor = DocFetchFailure;
  errors.DocFetchFailure = DocFetchFailure;

  // there was a conflict storing a doc
  function VersionConflict(resp) {
    this.name = 'VersionConflict';
    this.resp = resp;
    this.message = 'Failed to store document changes due to a version conflict.';
  }
  VersionConflict.prototype = new Error();
  VersionConflict.prototype.constructor = VersionConflict;
  errors.VersionConflict = VersionConflict;

  // there was a conflict storing a doc
  function MappingConflict(field) {
    this.name = 'MappingConflict';
    this.message = 'Field ' + field + ' is defined as at least two different types in indices matching the pattern';
  }
  MappingConflict.prototype = new Error();
  MappingConflict.prototype.constructor = MappingConflict;
  errors.MappingConflict = MappingConflict;

  return errors;
});