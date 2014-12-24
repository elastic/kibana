define(function (require) {
  var _ = require('lodash');

  /**
   * Take a sorting array and make it into an object
   * @param {array} 2 item array [fieldToSort, directionToSort]
   * @param {object} indexPattern used for determining default sort
   * @returns {object} a sort object suitable for returning to elasticsearch
   */
  return function (sort, indexPattern) {
    var sortObj = {};
    if (_.isArray(sort)) {
      // At some point we need to refact the sorting logic, this array sucks.
      if (sort.length !== 2) throw new Error('The sorting array contain exactly 2 items');
      sortObj[sort[0]] = sort[1];
    } else if (indexPattern.timeFieldName) {
      sortObj[indexPattern.timeFieldName] = 'desc';
    } else {
      sortObj._score = 'desc';
    }
    return sortObj;
  };
});
