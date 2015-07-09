define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');
  var uniqFilters = require('./lib/uniqFilters');

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
          aggConfigResult = findAggConfig(event.point.values);
        } else {
          aggConfigResult = event.point.aggConfigResult;
        }

        function findAggConfig(values) {
          if (_.isArray(values)) { // point series chart
            var index = _.findIndex(values, 'aggConfigResult');
            return values[index].aggConfigResult;
          }
          return values.aggConfigResult; // pie chart
        }

        function findLabel(obj) {
          // TODO: find out if there is always a fieldFormatter
          var formatter = obj.aggConfig.fieldFormatter();
          return formatter(obj.key) === event.label;
        }

        if (aggConfigResult) {
          var isLegendLabel = !!event.point.values;
          var results = _.filter(aggConfigResult.getPath(), { type: 'bucket' });

          if (isLegendLabel) results = _.filter(results, findLabel); // filter results array by legend label

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
