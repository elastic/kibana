define(function (require) {
  let _ = require('lodash');
  return function normalizeSortRequest(config) {
    let defaultSortOptions = config.get('sort:options');

    /**
     * Decorate queries with default parameters
     * @param {query} query object
     * @returns {object}
     */
    return function (sortObject, indexPattern) {
      let normalizedSort = [];

      // [].concat({}) -> [{}], [].concat([{}]) -> [{}]
      return [].concat(sortObject).map(function (sortable) {
        return normalize(sortable, indexPattern);
      });
    };

    /*
      Normalize the sort description to the more verbose format:
      { someField: "desc" } into { someField: { "order": "desc"}}
    */
    function normalize(sortable, indexPattern) {
      let normalized = {};
      let sortField = _.keys(sortable)[0];
      let sortValue = sortable[sortField];
      let indexField = indexPattern.fields.byName[sortField];

      if (indexField && indexField.scripted && indexField.sortable) {
        let direction;
        if (_.isString(sortValue)) direction = sortValue;
        if (_.isObject(sortValue) && sortValue.order) direction = sortValue.order;

        sortField = '_script';
        sortValue = {
          script: indexField.script,
          type: indexField.type,
          order: direction
        };
      } else {
        if (_.isString(sortValue)) {
          sortValue = { order: sortValue };
        }
        sortValue = _.defaults({}, sortValue, defaultSortOptions);
      }

      normalized[sortField] = sortValue;
      return normalized;
    }
  };
});

