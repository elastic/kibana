define(function (require) {
  var _ = require('lodash');

  /**
   * Take a sorting array and make it into an object
   * @param {array} 2 item array [fieldToSort, directionToSort]
   * @param {object} indexPattern used for determining default sort
   * @returns {object} a sort object suitable for returning to elasticsearch
   */
  function getSort(sort, indexPattern) {
    var sortObj = {};
    var field, direction;

    function getValue(field, key) {
      return (indexPattern.fields.byName[field] && indexPattern.fields.byName[field][key]);
    }

    if (_.isArray(sort) && sort.length === 2 && getValue(sort[0], 'sortable')) {
      // At some point we need to refact the sorting logic, this array sucks.
      field = sort[0];
      direction = sort[1];
    } else if (indexPattern.timeFieldName && getValue(indexPattern.timeFieldName, 'sortable')) {
      field = indexPattern.timeFieldName;
      direction = 'desc';
    }

    if (field) {
      // sorting on a scripted field requires the script value
      if (getValue(field, 'scripted')) {
        sortObj._script = {
          script: getValue(field, 'script'),
          type: getValue(field, 'type'),
          order: direction
        };
      } else {
        sortObj[field] = direction;
      }
    } else {
      sortObj._score = 'desc';
    }

    return sortObj;
  }

  getSort.array = function (sort, indexPattern) {
    return _(getSort(sort, indexPattern)).pairs().pop();
  };

  return getSort;
});
