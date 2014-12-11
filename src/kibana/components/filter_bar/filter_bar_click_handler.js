define(function (require) {
  var _ = require('lodash');
  var dedupFilters = require('./lib/dedupFilters');

  return function (Notifier) {
    return function ($state) {
      return function (event) {
        // Hierarchical and tabular data set their aggConfigResult parameter
        // differently because of how the point is rewritten between the two. So
        // we need to check if the point.orig is set, if not use try the point.aggConfigResult
        var aggConfigResult = event.point.orig && event.point.orig.aggConfigResult || event.point.aggConfigResult;
        var notify = new Notifier();

        if (aggConfigResult) {
          var results = _.filter(aggConfigResult.getPath(), { type: 'bucket' });
          var filters = _(results)
            .filter(function (result) {
              var field = result.aggConfig.field();
              var label = result.aggConfig.fieldDisplayName();
              var message = 'Filtering is not available for ' + label + '.';
              if (field.scripted) {
                message += ' This field is a scripted field and can not be used in filtering.';
              }
              if (!field.filterable) notify.warning(message);
              return field.filterable;
            })
            .map(function (result) {
              return result.createFilter();
            })
            .value();

          if (!filters.length) return;

          filters = dedupFilters($state.filters, filters);
          // We need to add a bunch of filter deduping here.
          $state.$newFilters = filters;
        }
      };
    };
  };
});
