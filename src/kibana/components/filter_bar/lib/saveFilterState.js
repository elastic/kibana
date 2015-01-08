define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');

  return function (state, globalState) {
    return saveState;

    /**
     * Save the filters back to the searchSource
     * @returns {void}
     */
    function saveState(filters) {
      // always dedupe filters
      filters = dedupe(filters);

      saveGlobalState(filters);

      // only save state if state exists
      if (state) {
        state.filters = filters;
      }

      return filters;
    }

    /**
     * Save pinned filters to the globalState
     * @returns {void}
     */
    function saveGlobalState(filters) {
      globalState.filters = _.filter(filters, { meta: { pinned: true } });
      globalState.save();
    }

    /**
     * Remove duplicate filters from an array of filters
     * @returns {array} deduped filters
     */
    function dedupe(filters) {
      var results = [];
      var seenFilters = [];
      var flatFilters = _.map(filters, function (filter) {
        // use angular.extend to remove any hash values
        return _.flattenWith('.', angular.extend({}, filter));
      });

      _.each(flatFilters, function (filter, i) {
        for (var n = 0; n < seenFilters.length; n++) {
          if (_.isEqual(seenFilters[n], filter)) return;
        }

        seenFilters.push(filter);
        results.push(filters[i]);
      });

      return results;
    }
  };
});
