import { escapeRegExp, memoize } from 'lodash';

export default function fieldWildcard(config) {
  const metaFields = config.get('metaFields');

  const makeRegEx = memoize(function makeRegEx(glob) {
    return new RegExp('^' + glob.split('*').map(escapeRegExp).join('.*') + '$');
  });

  function fieldWildcardMatcher(globs) {
    return function matcher(val) {
      return metaFields.indexOf(val) === -1 && globs.some(p => makeRegEx(p).test(val));
    };
  }

  function fieldWildcardFilter(globs) {
    const matcher = fieldWildcardMatcher(globs, config);
    return function filter(val) {
      return !matcher(val);
    };
  }

  return { makeRegEx, fieldWildcardMatcher, fieldWildcardFilter };
};
