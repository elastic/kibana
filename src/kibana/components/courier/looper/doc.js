define(function (require) {
  return function DocLooperService(Private) {
    var fetch = Private(require('components/courier/fetch/fetch'));
    var Looper = Private(require('components/courier/looper/_looper'));

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var docLooper = new Looper(1500, function () {
      fetch.docs();
    });

    return docLooper;
  };
});