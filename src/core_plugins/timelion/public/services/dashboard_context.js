import _ from 'lodash';
require('ui/state_management/app_state');


module.exports = function dashboardContext(Private, getAppState) {
  return function () {
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const bool = { must: [], must_not: [] };
    const filterBarFilters = queryFilter.getFilters();
    const queryBarFilter = getAppState().query;

    // Add the query bar filter, its handled differently.
    bool.must.push(queryBarFilter);

    // Add each of the filter bar filters
    _.each(filterBarFilters, function (filter) {
      const esFilter = _.omit(filter, function (val, key) {
        if (key === 'meta' || key[0] === '$') return true;
        return false;
      });

      if (filter.meta.disabled) return;
      if (filter.meta.negate) {
        bool.must_not.push(esFilter.query || esFilter);
      } else {
        bool.must.push(esFilter.query || esFilter);
      }
    });

    return { bool: bool };
  };
};
