define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');
  var uniqFilters = require('./lib/uniqFilters');

  function findAggConfigResult(values) {
    if (_.isArray(values)) { // point series chart
      var index = _.findIndex(values, 'aggConfigResult');
      return values[index].aggConfigResult;
    }
    return values.aggConfigResult; // pie chart
  }

  return function (Notifier) {
    return function ($state) {
      return function (event) {
        var notify = new Notifier({
          location: 'Filter bar'
        });
        var aggConfigResult;

        // Hierarchical and tabular data set their aggConfigResult parameter
        // differently because of how the point is rewritten between the two. So
        // we need to check if the point.orig is set, if not use try the point.aggConfigResult
        if (event.point.orig) {
          aggConfigResult = event.point.orig.aggConfigResult;
        } else if (event.point.values) {
          aggConfigResult = findAggConfigResult(event.point.values);
        } else {
          aggConfigResult = event.point.aggConfigResult;
        }

        if (aggConfigResult) {
          var isLegendLabel = !!event.point.values;
          var aggBuckets = _.filter(aggConfigResult.getPath(), { type: 'bucket' });

          // For legend clicks, use the last bucket in the path
          if (isLegendLabel) {
            aggBuckets = _.slice(aggBuckets, aggBuckets.length - 1);
          }

          var filters = _(aggBuckets)
          .map(function (result) {
            try {
              return result.createFilter();
            } catch (e) {
              notify.warning(e.message);
            }
          })
          .filter(Boolean)
          .value();

          if (!filters.length) return;

          filters = dedupFilters($state.filters, uniqFilters(filters));
          // We need to add a bunch of filter deduping here.
          $state.$newFilters = filters;
        }
      };
    };
  };
});
