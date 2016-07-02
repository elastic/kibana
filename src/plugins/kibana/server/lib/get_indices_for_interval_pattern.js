import patternToWildcard from './pattern_to_wildcard';
import _ from 'lodash';
import moment from 'moment';
import Promise from 'bluebird';

/**
 * Returns an object of index/alias names matching an interval based index pattern.
 *
 * @param {string} pattern - a Kibana interval index pattern
 * @param {function} boundCallWithRequest - a partial application of callWithRequest bound to the current request
 * @returns {object} An object with two keys:
 *   all - every index that matches a wildcard version of the interval pattern
 *   matches - a subset of all, with every index that matches the actual date pattern
 */
export default function (pattern, boundCallWithRequest) {
  return boundCallWithRequest('indices.getAlias', {
    index: patternToWildcard(pattern)
  })
  .then((response) => {
    return _(response)
    .map((index, key) => {
      if (index.aliases) {
        return [Object.keys(index.aliases), key];
      } else {
        return key;
      }
    })
    .flattenDeep()
    .sort()
    .uniq(true)
    .value();
  })
  .then((indices) => {
    return {
      all: indices,
      matches: _.filter(indices, (existingIndex) => {
        return existingIndex === moment(existingIndex, pattern).format(pattern);
      })
    };
  });
};
