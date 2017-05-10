import { toPath } from 'lodash';

export function prepend(path, value) {
  return [value].concat(toPath(path));
}

export function append(path, value) {
  return toPath(path).concat(value);
}
