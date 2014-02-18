define(function (require, module, exports) {
  var listenerCount = require('utils/event_emitter').listenerCount;

  // caused by a refresh attempting to start before the prevous is done
  function HastyRefresh() {
    this.name = 'HastyRefresh';
    this.message = 'Courier attempted to start a query before the previous had finished.';
  }
  HastyRefresh.prototype = new Error();
  HastyRefresh.prototype.constructor = HastyRefresh;
  exports.HastyRefresh = HastyRefresh;

  // a non-critical cache write to elasticseach failed
  function CacheWriteFailure() {
    this.name = 'CacheWriteFailure';
    this.message = 'A Elasticsearch cache write has failed.';
  }
  CacheWriteFailure.prototype = new Error();
  CacheWriteFailure.prototype.constructor = CacheWriteFailure;
  exports.CacheWriteFailure = CacheWriteFailure;

  // when a field mapping is requested for an unknown field
  function FieldNotFoundInCache(name) {
    this.name = 'FieldNotFoundInCache';
    this.message = 'The ' + name + ' field was not found in the cached mappings';
  }
  FieldNotFoundInCache.prototype = new Error();
  FieldNotFoundInCache.prototype.constructor = FieldNotFoundInCache;
  exports.FieldNotFoundInCache = FieldNotFoundInCache;

});