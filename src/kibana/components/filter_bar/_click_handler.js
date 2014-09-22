define(function (require) {
  var _ = require('lodash');
  return function ($state, notify) {
    return function (e) {
      // This code is only inplace for the beta release this will all get refactored
      // after we get the release out.
      if (e.aggConfig && e.aggConfig.aggType && e.aggConfig.aggType.name === 'terms') {
        var filter;
        var filters = _.flatten([$state.filters || []], true);
        var previous = _.find(filters, function (item) {
          if (item && item.query) {
            return item.query.match[e.field].query === e.label;
          }
        });
        if (!previous) {
          filter = { query: { match: {} } };
          filter.query.match[e.field] = { query: e.label, type: 'phrase' };
          filters.push(filter);
          $state.filters = filters;
        }
      } else {
        notify.info('Filtering is only supported for Term aggergations at the time, others are coming soon.');
      }
    };
  };
});
