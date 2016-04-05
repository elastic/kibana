import { memoize } from 'lodash';

export const makeRegEx = memoize(function makeRegEx(glob) {
  return new RegExp(glob.replace(/\*/g, '.*'));
});

export function fieldWildcardMatcher(globs) {
  return function matcher(val) {
    return globs.some(p => makeRegEx(p).test(val));
  };
}

export function fieldWildcardFilter(globs) {
  const matcher = fieldWildcardMatcher(globs);
  return function filter(val) {
    return !matcher(val);
  };
}
