define(function (require) {
  let _ = require('lodash');

  return function () {
    return function ($state) {
      if (!_.isObject($state)) throw new Error('pushFilters requires a state object');
      return function (filter, negate, index) {
        // Hierarchical and tabular data set their aggConfigResult parameter
        // differently because of how the point is rewritten between the two. So
        // we need to check if the point.orig is set, if not use try the point.aggConfigResult
        let filters = _.clone($state.filters || []);
        let pendingFilter = { meta: { negate: negate, index: index }};
        _.extend(pendingFilter, filter);
        filters.push(pendingFilter);
        $state.filters = filters;
      };
    };
  };
});
