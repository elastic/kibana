define(function (require) {
  var _ = require('lodash');
  return function generateMappingChainProvider(Promise) {

    var noop = function () {
      return Promise.reject(new Error('No mappings have been found for filter.'));
    };

    return function (fn) {
      return function (next) {
        next = next || noop;
        return function (filter) {
          return fn(filter).catch(function (result) {
            if (result === filter) {
              return next(filter);
            }
            throw result;
          });
        };
      };
    };

  };
});
