define(function (require) {
  var _ = require('lodash');

  var module = require('modules').get('kibana/services');

  module.service('promises', function ($q) {
    function playNice(fn, fns) {
      if (fns && _.isArray(fns) && _.isObject(fn)) {
        fns.forEach(function (method) {
          fn[method] = playNice(fn[method]);
        });
        return fn;
      }

      return function playNiceWrapper() {
        // if the last arg is a callback then don't do anything
        if (typeof arguments[arguments.length - 1] === 'function') {
          return fn.apply(this, arguments);
        }

        // otherwise create a callback and pass it in
        var args = Array.prototype.slice.call(arguments);
        var defer = $q.defer();
        args.push(function (err, result) {
          if (err) return defer.reject(err);
          defer.resolve(result);
        });
        fn.apply(this, args);
        return defer.promise;
      };
    }


    return {
      playNice: playNice
    };
  });

  // Provides a tiny subset of the excelent API from
  // bluebird, reimplemented using the $q service
  module.service('Promise', function ($q) {
    function Promise(fn) {
      var defer = $q.defer();
      try {
        fn(defer.resolve, defer.reject, defer);
      } catch (e) {
        defer.reject(e);
      }
      return defer.promise;
    }

    Promise.all = $q.all;
    Promise.resolved = function (val) {
      var defer = $q.defer();
      defer.resolve(val);
      return defer.promise;
    };
    Promise.rejected = function (reason) {
      var defer = $q.defer();
      defer.reject(reason);
      return defer.promise;
    };
    Promise.cast = $q.when;
    Promise.defer = $q.defer;
    Promise.nodeify = function (promise, cb) {
      promise.then(function (val) {
        cb(void 0, val);
      }, cb);
    };

    /**
     * Create a promise that uses our "event" like pattern.
     *
     * When a single argument is passed, this will behave just like calling `new Promise(fn)`,
     * but when a second arguemnt is passed, the fn will be used to recreate a promise eveytime
     * the previous is resolved. The following example demonstrates what this allows:
     *
     * When using `new Promise()` to create a promise, you can allow consumers to be
     * notified of a single change:
     * ```
     * obj.onUpdate= function() {
     *   // NOTE: we are NOT using `new Promise.emitter()` here
     *   return new Promise(function (resolve, reject) {
     *     // wait for the update...
     *     resolve();
     *   });
     * }
     * ```
     *
     * And the consumer can ask for continual updates be re-invoking the `.onChange()` method
     * every time a change occurs:
     * ```
     * obj.onChange().then(function useChanges(change) {
     *   // use changes...
     *   // then register to receive notifcation of the next change
     *   obj.onChange().then(useChanges);
     * });
     * ```
     *
     * But by defining obj.onChange using `new Promise.emitter`:
     * ```
     * obj.onChange = function (handler) {
     *   return new Promise.emitter(function (resolve, reject) {
     *     // wait for changes...
     *     resolve();
     *   });
     * };
     * ```
     *
     * The consumer can now simplify their code by passing the handler directly to `.onUpdate()`
     * and the boilerplate of recalling `.onUpdate()` will be handled for them.
     * ```
     * obj.onChanges(function useChanges(changes) {
     *   // use changes...
     * });
     * ```
     *
     * @param  {Function} fn - Used to init the promise, and call either reject or resolve (passed as args)
     * @param  {Function} handler - A function that will be called every
     *                            time this promise is resolved
     * @return {Promise}
     */
    Promise.emitter = function (fn, handler) {
      var prom = new Promise(fn);

      if (handler) {
        prom.then(handler).then(function () {
          return new Promise(fn).then(handler);
        });
      }

      return prom;
    };

    return Promise;
  });
});