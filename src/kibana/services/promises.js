define(function (require, module, exports) {
  var _ = require('lodash');
  var angular = require('angular');

  angular.module('kibana/services')
    .service('promises', function ($q) {

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
});