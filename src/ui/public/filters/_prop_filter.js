define(function (require) {
  let _ = require('lodash');

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

      let options = filters.reduce(function (options, filter) {
        let type = 'include';
        let value = filter;

        if (filter.charAt(0) === '!') {
          type = 'exclude';
          value = filter.substr(1);
        }

        if (!options[type]) options[type] = [];
        options[type].push(value);
        return options;
      }, {});

      return list.filter(function (item) {
        let value = item[prop];

        let excluded = options.exclude && _.contains(options.exclude, value);
        if (excluded) return false;

        let included = !options.include || _.contains(options.include, value);
        if (included) return true;

        return false;
      });
    };
  }

  return propFilter;
});
