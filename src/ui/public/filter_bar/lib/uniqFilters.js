define(function (require) {
  let _ = require('lodash');
  let dedupFilters = require('ui/filter_bar/lib/dedupFilters');

  /**
   * Remove duplicate filters from an array of filters
   * @param {array} filters The filters to remove duplicates from
   * @returns {object} The original filters array with duplicates removed
   */
  return function (filters, comparatorOptions) {
    let results = [];
    _.each(filters, function (filter) {
      results = _.union(results, dedupFilters(results, [filter], comparatorOptions));
    });
    return results;
  };
});
