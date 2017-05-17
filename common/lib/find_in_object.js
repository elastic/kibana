import { isObject, each } from 'lodash';

export function findInObject(o, fn, memo) {
  memo = memo || [];
  if (fn(o)) memo.push(o);
  if (isObject(o)) {
    each(o, val => findInObject(val, fn, memo));
  }
  return memo;
}
