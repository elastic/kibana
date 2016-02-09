import _ from 'lodash';
import FilterBarLibMapFilterProvider from 'ui/filter_bar/lib/mapFilter';
export default function mapAndFlattenFiltersProvider(Private, Promise) {
  var mapFilter = Private(FilterBarLibMapFilterProvider);
  return function (filters) {
    return _(filters)
    .flatten()
    .compact()
    .map(mapFilter)
    .thru(Promise.all)
    .value();
  };
};
