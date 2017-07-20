import _ from 'lodash';
import unzipPairs from './unzipPairs.js';

export default function asSorted(timeValObject, fn) {
  const data = unzipPairs(timeValObject);
  return _.zipObject(fn(data));
}
