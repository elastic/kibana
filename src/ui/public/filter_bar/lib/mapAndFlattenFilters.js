import _ from 'lodash';
define(function (require) {
  return function mapAndFlattenFiltersProvider(Private, Promise) {
    var mapFilter = Private(require('ui/filter_bar/lib/mapFilter'));
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
