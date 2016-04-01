define(function (require) {
  let _ = require('lodash');
  return function mapAndFlattenFiltersProvider(Private, Promise) {
    let mapFilter = Private(require('ui/filter_bar/lib/mapFilter'));
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
