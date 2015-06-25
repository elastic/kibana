define(function (require) {
  var _ = require('lodash');

  function WorkQueue() {
    var q = this;

    var work = [];
    var fullDefers = [];

    q.limit = 0;
    Object.defineProperty(q, 'length', {
      get: function () {
        return work.length;
      }
    });

    var checkIfFull = function () {
      if (work.length >= q.limit) {
        fullDefers.length && resolve(fullDefers);
      }
    };

    var resolve = function (defers) {
      return defers.splice(0).map(function (defer) {
        return defer.resolve();
      });
    };

    q.resolveWhenFull = function (defer) {
      fullDefers.push(defer);
      checkIfFull();
    };

    q.doWork = function () {
      var resps = resolve(work);
      checkIfFull();
      return resps;
    };

    q.empty = function () {
      work.splice(0);
      checkIfFull();
    };

    q.push = function (defer) {
      work.push(defer);
      checkIfFull();
    };
  }

  return WorkQueue;
});