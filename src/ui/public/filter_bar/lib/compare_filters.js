import _ from 'lodash';
let excludedAttributes;
let comparators;

/**
 * Compare two filters to see if they match
 * @param {object} first The first filter to compare
 * @param {object} second The second filter to compare
 * @param {object} comparatorOptions Parameters to use for comparison
 * @returns {bool} Filters are the same
 */
export default function (first, second, comparatorOptions) {
  excludedAttributes = ['$$hashKey', 'meta'];
  comparators = _.defaults(comparatorOptions || {}, {
    state: false,
    negate: false,
    disabled: false,
  });

  if (!comparators.state) excludedAttributes.push('$state');

  return _.isEqual(mapFilter(first), mapFilter(second));
}

function mapFilter(filter) {
  const cleaned = _.omit(filter, excludedAttributes);
  if (comparators.negate) cleaned.negate = filter.meta && !!filter.meta.negate;
  if (comparators.disabled) cleaned.disabled = filter.meta && !!filter.meta.disabled;
  return cleaned;
}
