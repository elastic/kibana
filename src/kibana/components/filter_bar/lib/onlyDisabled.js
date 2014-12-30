define(function (require) {
  var _ = require('lodash');

  var pluckDisabled = function (filter) {
    return _.deepGet(filter, 'meta.disabled');
  };

  return function (newFitlers, oldFilters) {
    var diff = _.difference(oldFilters, newFitlers);
    return (diff.length && _.every(diff, pluckDisabled));
  };
});
