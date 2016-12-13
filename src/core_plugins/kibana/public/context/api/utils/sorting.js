import _ from 'lodash';


function reverseQuerySort(query) {
  return {
    ...query,
    sort: _.get(query, 'sort', []).map(reverseSortDirective),
  };
}

function reverseSortDirective(sortDirective) {
  if (_.isString(sortDirective)) {
    return {
      [sortDirective]: (sortDirective === '_score' ? 'asc' : 'desc'),
    };
  } else if (_.isObject(sortDirective)) {
    return _.mapValues(sortDirective, reverseSortDirection);
  } else {
    return sortDirective;
  }
}

function reverseSortDirection(sortDirection) {
  if (_.isObject(sortDirection)) {
    return sortDirection.order = reverseSortDirection(sortDirection.order);
  } else {
    return (sortDirection === 'asc' ? 'desc' : 'asc');
  }
}


export {
  reverseQuerySort,
  reverseSortDirection,
  reverseSortDirective,
};
