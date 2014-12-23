define(function (require) {
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      var dslFilters = _.deepGet(aggConfig.toDsl(), 'filters.filters');
      var filter = dslFilters[key];

      if (filter) {
        return {
          query: filter.query,
          meta: {
            index: aggConfig.vis.indexPattern.id
          }
        };
      }
    };
  };
});
