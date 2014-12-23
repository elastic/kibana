define(function (require) {
  var _ = require('lodash');
  return function filterOutTimeBaseFilter(courier, Promise) {
    return Promise.method(function (filters) {
      var id = _.deepGet(filters, '[0].meta.index');
      if (id == null) return;

      return courier.indexPatterns.get(id).then(function (indexPattern) {
        return _.filter(filters, function (filter) {
          return !(filter.range && filter.range[indexPattern.timeFieldName]);
        });
      });
    });
  };
});
