define(function (require) {
  var _ = require('lodash');

  var module = require('modules').get('kibana/promises');

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

    return Promise;
  });
});