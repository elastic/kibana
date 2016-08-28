import { escapeRegExp, memoize } from 'lodash';

export default function fieldWildcard(config) {
  const metaFields = config.get('metaFields');

  const makeRegEx = memoize(function makeRegEx(glob) {
    return new RegExp('^' + glob.split('*').map(escapeRegExp).join('.*') + '$');
  });

  function endsWith(str, test) {
    if (!str || typeof str !== 'string' || str.length < test.length) {
      return false;
    }
    return str.substring(str.length - test.length) === test;
  }

  function fieldWildcardMatcher(globs) {
    return function matcher(val) {
      // do not test metaFields or keyword
      if (metaFields.indexOf(val) !== -1 || endsWith(val, '.keyword')) {
        return false;
      }
      return globs.some(p => makeRegEx(p).test(val));
    };
  }

  function fieldWildcardFilter(globs) {
    const matcher = fieldWildcardMatcher(globs);
    return function filter(val) {
      return !matcher(val);
    };
  }

  return { makeRegEx, fieldWildcardMatcher, fieldWildcardFilter };
};
