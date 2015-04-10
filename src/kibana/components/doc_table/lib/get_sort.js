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

    function useTimeField() {
      var timeField = (indexPattern.timeFieldName && indexPattern.fields.byName[indexPattern.timeFieldName]);
      if (timeField && timeField.sortable) {
        field = timeField;
        direction = 'desc';
      } else {
        field = direction = undefined;
      }
    }

    if (_.isArray(sort) && sort.length === 2) {
      field = indexPattern.fields.byName[sort[0]];

      if (field && field.sortable) {
        // At some point we need to refact the sorting logic, this array sucks.
        direction = sort[1];
      } else {
        useTimeField();
      }
    } else {
      useTimeField();
    }

    if (field) {
      // sorting on a scripted field requires the script value
      if (field.scripted) {
        sortObj._script = {
          script: field.script,
          type: field.type,
          order: direction
        };
      } else {
        sortObj[field.name] = direction;
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
