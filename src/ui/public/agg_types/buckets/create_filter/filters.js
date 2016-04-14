define(function (require) {
  let buildQueryFilter = require('ui/filter_manager/lib/query');
  let _ = require('lodash');
  return function CreateFilterFiltersProvider(Private) {
    return function (aggConfig, key) {
      // have the aggConfig write agg dsl params
      let dslFilters = _.get(aggConfig.toDsl(), 'filters.filters');
      let filter = dslFilters[key];

      if (filter) {
        return buildQueryFilter(filter.query, aggConfig.vis.indexPattern.id);
      }
    };
  };
});
