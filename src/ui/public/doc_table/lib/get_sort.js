import _ from 'lodash';

/**
 * Take a sorting array and make it into an object
 * @param {array} 2 item array [fieldToSort, directionToSort]
 * @param {object} indexPattern used for determining default sort
 * @returns {object} a sort object suitable for returning to elasticsearch
 */
export function getSort(sort, indexPattern, defaultSortOrder = 'desc') {
  const sortObj = {};
  let field;
  let direction;

  function isSortable(field) {
    return (indexPattern.fields.byName[field] && indexPattern.fields.byName[field].sortable);
  }

  if (Array.isArray(sort) && sort.length === 2 && isSortable(sort[0])) {
    // At some point we need to refact the sorting logic, this array sucks.
    field = sort[0];
    direction = sort[1];
  } else if (indexPattern.timeFieldName && isSortable(indexPattern.timeFieldName)) {
    field = indexPattern.timeFieldName;
    direction = defaultSortOrder;
  }

  if (field) {
    sortObj[field] = direction;
  } else {
    sortObj._score = 'desc';
  }



  return sortObj;
}

getSort.array = function (sort, indexPattern, defaultSortOrder) {
  return _(getSort(sort, indexPattern, defaultSortOrder)).pairs().pop();
};

