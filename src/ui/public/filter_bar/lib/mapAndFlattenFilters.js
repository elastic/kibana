import _ from 'lodash';
import FilterBarLibMapFilterProvider from 'ui/filter_bar/lib/mapFilter';
define(function (require) {
  return function mapAndFlattenFiltersProvider(Private, Promise) {
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
});
