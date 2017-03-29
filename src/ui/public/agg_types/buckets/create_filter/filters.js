import buildQueryFilter from 'ui/filter_manager/lib/query';
import _ from 'lodash';
export default function CreateFilterFiltersProvider() {
  return function (aggConfig, key) {
    // have the aggConfig write agg dsl params
    const dslFilters = _.get(aggConfig.toDsl(), 'filters.filters');
    const filter = dslFilters[key];

    if (filter) {
      return buildQueryFilter(filter.query, aggConfig.vis.indexPattern.id);
    }
  };
}
