define(function (require) {
  var _ = require('lodash');
  return function extractTimeFilterProvider(courier) {
    return function (filters) {
      // Assume all the index patterns are the same since they will be added
      // from the same visualization.
      var id = filters[0].meta.index;
      return courier.indexPatterns.get(id).then(function (indexPattern) {
        var filter = _.find(filters, function (obj) {
          var key = _.keys(obj.range)[0];
          return key === indexPattern.timeFieldName;
        });
        if (filter && filter.range) {
          return filter;
        }
      });
    };
  };
});
