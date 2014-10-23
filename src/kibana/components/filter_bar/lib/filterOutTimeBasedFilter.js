define(function (require) {
  var _ = require('lodash');
  return function filterOutTimeBaseFilter(courier) {
    return function (filters) {
      var id = filters[0].$$indexPattern;
      return courier.indexPatterns.get(id).then(function (indexPattern) {
        return _.filter(filters, function (filter) {
          return !(filter.range && filter.range[indexPattern.timeFieldName]);
        });
      });
    };
  };
});
