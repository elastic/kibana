define(function (require) {
  return function DocLooperService(Private) {
    var fetch = Private(require('ui/courier/fetch/fetch'));
    var Looper = Private(require('ui/courier/looper/_looper'));
    var docStrategy = Private(require('ui/courier/fetch/strategy/doc'));

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var docLooper = new Looper(1500, function () {
      fetch.fetchQueued(docStrategy);
    });

    return docLooper;
  };
});
