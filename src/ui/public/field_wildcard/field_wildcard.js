import { escapeRegExp, memoize } from 'lodash';

export function FieldWildcardProvider(config) {
  const metaFields = config.get('metaFields');

  const makeRegEx = memoize(function makeRegEx(glob) {
    return new RegExp('^' + glob.split('*').map(escapeRegExp).join('.*') + '$');
  });

  // Note that this will return an essentially noop function if globs is undefined.
  function fieldWildcardMatcher(globs = []) {
    return function matcher(val) {
      // do not test metaFields or keyword
      if (metaFields.indexOf(val) !== -1) {
        return false;
      }
      return globs.some(p => makeRegEx(p).test(val));
    };
  }

  // Note that this will return an essentially noop function if globs is undefined.
  function fieldWildcardFilter(globs = []) {
    const matcher = fieldWildcardMatcher(globs);
    return function filter(val) {
      return !matcher(val);
    };
  }

  return { makeRegEx, fieldWildcardMatcher, fieldWildcardFilter };
}
