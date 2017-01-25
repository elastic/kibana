import _ from 'lodash';

/**
 * A sort directive in object or string form.
 *
 * @typedef {(SortDirectiveString|SortDirectiveObject)} SortDirective
 */

/**
 * A sort directive in object form.
 *
 * @typedef {Object.<FieldName, (SortDirection|SortOptions)>} SortDirectiveObject
 */

/**
 * A sort order string.
 *
 * @typedef {('asc'|'desc')} SortDirection
 */

/**
 * A field name.
 *
 * @typedef {string} FieldName
 */

/**
 * A sort options object
 *
 * @typedef {Object} SortOptions
 * @property {SortDirection} order
 */


/**
 * Return a copy of a query with the sort direction reversed.
 *
 * @param {Object} query - The query to reverse the sort direction of.
 *
 * @returns {Object}
 */
function reverseQuerySort(query) {
  return Object.assign(
    {},
    query,
    {
      sort: _.get(query, 'sort', []).map(reverseSortDirective),
    }
  );
}

/**
 * Return a copy of the directive with the sort direction reversed. If the
 * field name is '_score', it inverts the default sort direction in the same
 * way as Elasticsearch itself.
 *
 * @param {SortDirective} sortDirective - The directive to reverse the
 *     sort direction of
 *
 * @returns {SortDirective}
 */
function reverseSortDirective(sortDirective) {
  if (_.isString(sortDirective)) {
    return {
      [sortDirective]: (sortDirective === '_score' ? 'asc' : 'desc'),
    };
  } else if (_.isPlainObject(sortDirective)) {
    return _.mapValues(sortDirective, reverseSortDirection);
  } else {
    return sortDirective;
  }
}

/**
 * Return the reversed sort direction.
 *
 * @param {(SortDirection|SortOptions)} sortDirection
 *
 * @returns {(SortDirection|SortOptions)}
 */
function reverseSortDirection(sortDirection) {
  if (_.isPlainObject(sortDirection)) {
    return _.assign({}, sortDirection, {
      order: reverseSortDirection(sortDirection.order),
    });
  } else {
    return (sortDirection === 'asc' ? 'desc' : 'asc');
  }
}


export {
  reverseQuerySort,
  reverseSortDirection,
  reverseSortDirective,
};
