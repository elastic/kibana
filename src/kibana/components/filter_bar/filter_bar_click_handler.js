define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');
  var uniqFilters = require('./lib/uniqFilters');

  return function (Notifier) {
    return function ($state) {
      return function (event) {
        // Hierarchical and tabular data set their aggConfigResult parameter
        // differently because of how the point is rewritten between the two. So
        // we need to check if the point.orig is set, if not use try the point.aggConfigResult
        var aggConfigResult = event.point.orig && event.point.orig.aggConfigResult ||
          event.point.values && event.point.values[_.findIndex(event.point.values, 'aggConfigResult')].aggConfigResult
          || event.point.aggConfigResult;
        var notify = new Notifier({
          location: 'Filter bar'
        });

        if (aggConfigResult) {
          var isLegendLabel = !!event.point.values;
          var results = _.filter(aggConfigResult.getPath(), { type: 'bucket' });

          results = isLegendLabel ? _.filter(results, function (obj) {
            var formatter = obj.aggConfig.fieldFormatter();  // TODO: find out if there is always a fieldFormatter
            return formatter(obj.key) === event.label;
          }) : results;

          var filters = _(results)
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
