define(function (require) {
  var buildQueryFilter = require('components/filter_manager/lib/query');
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      var dslFilters = _.deepGet(aggConfig.toDsl(), 'filters.filters');
      var filter = dslFilters[key];

      if (filter) {
        return buildQueryFilter(filter.query, aggConfig.vis.indexPattern.id);
      }
    };
  };
});
