import { each } from 'lodash';

export function findInObject(o, fn, memo, name) {
  memo = memo || [];
  if (fn(o, name)) memo.push(o);
  if (o != null && typeof o === 'object') {
    each(o, (val, name) => findInObject(val, fn, memo, name));
  }
  return memo;
}
