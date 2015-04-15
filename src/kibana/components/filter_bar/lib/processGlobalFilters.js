define(function (require) {
  var _ = require('lodash');

  return function (globalState) {
    /**
     * Reads filters from global state and applies them to the scope state
     * Strips pinned filters, and applies pinned filters from global state
     * @returns {void}
     */
    return function (filters) {
      var globalFilters = (globalState.filters) ? globalState.filters.filter(function (filter) {
        return filter.meta.pinned;
      }) : [];

      return _.union(stripPinned(filters), globalFilters);
    };

    function stripPinned(filters) {
      if (!filters) return [];
      return filters.filter(function (filter) {
        return !filter.meta.pinned;
      });
    }
  };
});
