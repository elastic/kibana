define(function (require) {
  /**
   * Remap the filter from the intermediary back to it's original.
   * @param {object} filter The original filter
   * @returns {object}
   */
  return function (filter) {
    return filter.filter;
  };

});
