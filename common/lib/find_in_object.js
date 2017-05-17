import { isObject, each } from 'lodash';

export function findInObject(o, fn, memo, name) {
  memo = memo || [];
  if (fn(o, name)) memo.push(o);
  if (isObject(o)) {
    each(o, (val, name) => findInObject(val, fn, memo, name));
  }
  return memo;
}
