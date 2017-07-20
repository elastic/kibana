import _ from 'lodash';
import { FilterBarLibMapAndFlattenFiltersProvider } from 'ui/filter_bar/lib/map_and_flatten_filters';

export function FilterBarLibMapFlattenAndWrapFiltersProvider(Private) {
  const mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  return function (filters) {
    return mapAndFlattenFilters(filters).then(function (filters) {
      return _.map(filters, function (filter) {
        filter.meta = filter.meta || {};
        filter.meta.apply = true;
        return filter;
      });
    });
  };
}
