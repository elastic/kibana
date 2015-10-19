define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');
  var uniqFilters = require('./lib/uniqFilters');

  // given an object or array of objects, return the value of the passed param
  // if the param is missing, return undefined
  function findByParam(values, param) {
    if (_.isArray(values)) { // point series chart
      var index = _.findIndex(values, param);
      if (index === -1) return;
      return values[index][param];
    }
    return values[param]; // pie chart
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
          aggConfigResult = findByParam(event.point.values, 'aggConfigResult');
        } else {
          aggConfigResult = event.point.aggConfigResult;
        }

        if (aggConfigResult) {
          var isLegendLabel = !!event.point.values;
          var aggBuckets = _.filter(aggConfigResult.getPath(), { type: 'bucket' });

          // For legend clicks, use the last bucket in the path
          if (isLegendLabel) {
            // series data has multiple values, use aggConfig on the first
            // hierarchical data values is an object with the addConfig
            var aggConfig = findByParam(event.point.values, 'aggConfig');
            aggBuckets = aggBuckets.filter((result) => result.aggConfig && result.aggConfig === aggConfig);
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
