define(function (require) {
  return function DocLooperService(Private) {
    var fetch = Private(require('../fetch/fetch'));
    var Looper = Private(require('./_looper'));

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var docLooper = new Looper(1500, fetch.docs).start();

    return docLooper;
  };
});