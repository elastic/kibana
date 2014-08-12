define(function (require) {
  return function DiffTimePickerValuesFn() {
    var _ = require('lodash');
    var angular = require('angular');

    var valueOf = function (o) {
      if (o) return o.valueOf();
    };

    return function (rangeA, rangeB) {
      if (_.isObject(rangeA) && _.isObject(rangeB)) {
        if (
          valueOf(rangeA.to) !== valueOf(rangeB.to)
          || valueOf(rangeA.from) !== valueOf(rangeB.from)
        ) {
          return true;
        }
      } else {
        return !angular.equals(rangeA, rangeB);
      }

      return false;
    };
  };
});