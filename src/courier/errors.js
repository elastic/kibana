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
});