define(function (require) {
  var buildFilterQuery = require('components/filter_manager/lib/query');
  var _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      var dslFilters = _.deepGet(aggConfig.toDsl(), 'filters.filters');
      var filter = dslFilters[key];

      if (filter) {
        return buildFilterQuery(filter.query, aggConfig.vis.indexPattern.id);
      }
    };
  };
});
