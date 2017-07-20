import { escapeRegExp, memoize } from 'lodash';

export function FieldWildcardProvider(config) {
  const metaFields = config.get('metaFields');

  const makeRegEx = memoize(function makeRegEx(glob) {
    return new RegExp('^' + glob.split('*').map(escapeRegExp).join('.*') + '$');
  });

  function fieldWildcardMatcher(globs) {
    return function matcher(val) {
      // do not test metaFields or keyword
      if (metaFields.indexOf(val) !== -1) {
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
}
