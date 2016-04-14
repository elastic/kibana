define(function (require) {
  let _ = require('lodash');
  let angular = require('angular');
  let compareFilters = require('ui/filter_bar/lib/compareFilters');

  /**
   * Combine 2 filter collections, removing duplicates
   * @param {object} existing The filters to compare to
   * @param {object} filters The filters being added
   * @param {object} comparatorOptions Parameters to use for comparison
   * @returns {object} An array of filters that were not in existing
   */
  return function (existingFilters, filters, comparatorOptions) {
    if (!_.isArray(filters)) filters = [filters];

    return _.filter(filters, function (filter) {
      return !_.find(existingFilters, function (existingFilter) {
        return compareFilters(existingFilter, filter, comparatorOptions);
      });
    });
  };
});
