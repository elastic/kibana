define(function (require) {
  let _ = require('lodash');
  return function mapFlattenAndWrapFilters(Private) {
    let mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
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
});
