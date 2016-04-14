define(function (require) {
  return function DocLooperService(Private) {
    let fetch = Private(require('ui/courier/fetch/fetch'));
    let Looper = Private(require('ui/courier/looper/_looper'));
    let docStrategy = Private(require('ui/courier/fetch/strategy/doc'));

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    let docLooper = new Looper(1500, function () {
      fetch.fetchQueued(docStrategy);
    });

    return docLooper;
  };
});
