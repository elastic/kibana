define(function (require) {
  var _ = require('lodash');
  var excludedAttributes = ['meta', '$$hashKey'];
  return function (existing, filters) {
    filters = _.filter(filters, function (item) {
      return !_.find(existing, function (existingFilter) {
        return _.isEqual(_.omit(existingFilter, excludedAttributes), _.omit(item, excludedAttributes));
      });
    });
    return filters;
  };
});
