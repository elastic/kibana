define(function (require) {
  var _ = require('lodash');
  return function normalizeSortRequest(config) {
    /**
     * Decorate queries with default parameters
     * @param {query} query object
     * @returns {object}
     */
    return function (sortObject) {
      if (!_.isArray(sortObject)) sortObject = [sortObject];
      var defaultSortOptions = config.get('sort:options');

      /*
        Normalize the sort description to the more verbose format:
        { someField: "desc" } into { someField: { "order": "desc"}}
      */
      _.each(sortObject, function (sortable) {
        var sortField = _.keys(sortable)[0];
        var sortValue = sortable[sortField];
        if (_.isString(sortValue)) {
          sortValue = sortable[sortField] = { order: sortValue };
        }
        _.defaults(sortValue, defaultSortOptions);
      });
      return sortObject;
    };
  };
});

