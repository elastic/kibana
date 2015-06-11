define(function (require) {
  var _ = require('lodash');
  return function mapAndFlattenFiltersProvider(Private, Promise) {
    var mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
    return function (filters) {
      return _(filters)
      .flatten(true)
      .compact()
      .map(mapFilter)
      .thru(Promise.all)
      .value();
    };
  };
});
