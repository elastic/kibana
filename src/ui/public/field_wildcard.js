import { memoize } from 'lodash';

export const makeRegEx = memoize(function makeRegEx(glob) {
  return new RegExp(glob.replace(/\*/g, '.*'));
});

export function fieldWildcardFilter(globs) {
  return function filter(val) {
    return !globs.some(p => makeRegEx(p).test(val));
  };
}
