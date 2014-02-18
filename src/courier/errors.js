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
    this.message = 'Failed to store document changes do to a version conflict.';
  }
  VersionConflict.prototype = new Error();
  VersionConflict.prototype.constructor = VersionConflict;
  errors.VersionConflict = VersionConflict;

  return errors;
});