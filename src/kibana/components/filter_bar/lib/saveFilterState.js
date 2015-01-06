define(function (require) {
  var _ = require('lodash');

  return function (state, globalState) {
    return saveState;

    /**
     * Save the filters back to the searchSource
     * @returns {void}
     */
    function saveState(filters) {
      saveGlobalState(filters);

      // only save state if state exists
      if (state) {
        state.filters = _.union(filters);
      }
    }

    /**
     * Save pinned filters to the globalState
     * @returns {void}
     */
    function saveGlobalState(filters) {
      globalState.filters = _.union(_.filter(filters, { meta: { pinned: true } }));
      globalState.save();
    }
  };
});
