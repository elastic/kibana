define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('components/filter_bar/lib/dedupFilters');
  return function (filters) {
    var results = [];
    _.each(filters, function (filter) {
      results = _.union(results, dedupFilters(results, [filter]));
    });
    return results;
  };
});
