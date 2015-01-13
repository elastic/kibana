define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var excludedAttributes = ['meta'];

  return function (existing, filters) {
    existing = cleanFilters(existing);

    filters = _.filter(filters, function (item) {
      return !_.find(existing, function (existingFilter) {
        return _.isEqual(existingFilter, cleanFilter(item));
      });
    });
    return filters;
  };

  function cleanFilter(filter) {
    // use angular.extend to string $$hashKey and other angular props
    filter = angular.extend({}, filter);
    return _.omit(filter, excludedAttributes);
  }

  function cleanFilters(filters) {
    return _.map(filters, cleanFilter);
  }
});
