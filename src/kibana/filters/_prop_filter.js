define(function (require) {
  var _ = require('lodash');

  /**
   * Filters out a list by a given filter. This is currently used to impelment:
   *   - fieldType filters a list of fields by their type property
   *   - aggFilter filters a list of aggs by their name property
   *
   * @returns {function} - the filter function which can be registered with angular
   */
  function propFilter(prop) {
    /**
     * List filtering function which accepts an array or list of values that a property
     * must contain
     *
     * @param  {array} list - array of items to filter
     * @param  {array|string} filters - the values to match against the list. Can be
     *                                an array, a single value as a string, or a comma
     *                                -seperated list of items
     * @return {array} - the filtered list
     */
    return function (list, filters) {
      if (!filters) return filters;
      if (!_.isArray(filters)) filters = filters.split(',');
      if (_.contains(filters, '*')) return list;

      filters = filters.map(function (filter) {
        var match = true;
        var value = filter;

        if (filter.charAt(0) === '!') {
          match = false;
          value = filter.substr(1);
        }

        return {
          match: match,
          value: value
        };
      });

      return list.filter(function (item) {
        for (var i = 0; i < filters.length; i++) {
          var filter = filters[i];
          if ((item[prop] === filter.value) === filter.match) return true;
        }
      });
    };
  }

  return propFilter;
});