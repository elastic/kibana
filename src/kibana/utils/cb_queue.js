define(function (require) {
  var _ = require('utils/mixins');

  function CallBackQueue(initFn) {
    var cbs = [];
    var queue = this;

    // on initial flush, call the init function, but ensure
    // that it only happens once
    var flush = _.once(function () {
      initFn(function (name) {
        // override flush to always clear the queue asynchronously
        flush = function () {
          setTimeout(function () {
            _.callEach(cbs.splice(0));
          }, 0);
        };

        flush();
      });
    });

    queue.push = function (cb) {
      if (typeof cb === 'function') cbs.push(cb);
      // always call flush
      flush();
      return cbs.length;
    };
  }

  return CallBackQueue;
});