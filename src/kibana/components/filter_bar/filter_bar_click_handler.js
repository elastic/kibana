define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');

  return function ($state, vis) {
    return function (event) {
      // Hierarchical and tabular data set their aggConfigResult parameter
      // differently because of how the point is rewritten between the two. So
      // we need to check if the point.orig is set, if not use try the point.aggConfigResult
      var aggConfigResult = event.point.orig && event.point.orig.aggConfigResult || event.point.aggConfigResult;

      if (aggConfigResult) {
        var results = _.filter(aggConfigResult.getPath(), { type: 'bucket' });
        var filters = _.map(results, function (result) {
          return result.createFilter();
        });

        filters = dedupFilters($state.filters, filters);
        // We need to add a bunch of filter deduping here.
        $state.$newFilters = filters;
      }
    };
  };
});
