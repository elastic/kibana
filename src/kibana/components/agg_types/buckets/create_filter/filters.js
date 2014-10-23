define(function (require) {
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      return _.find(aggConfig.params.filters, function (filter) {
        filter.$$indexPattern = aggConfig.vis.indexPattern.id;
        return filter.query.query_string.query === key;
      });
    };
  };
});
