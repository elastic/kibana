import _ from 'lodash';
import FilterBarLibMapAndFlattenFiltersProvider from 'ui/filter_bar/lib/mapAndFlattenFilters';
export default function mapFlattenAndWrapFilters(Private) {
  var mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  return function (filters) {
    return mapAndFlattenFilters(filters).then(function (filters) {
      return _.map(filters, function (filter) {
        filter.meta = filter.meta || {};
        filter.meta.apply = true;
        return filter;
      });
    });
  };
};
