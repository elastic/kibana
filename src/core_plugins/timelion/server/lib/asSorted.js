import _ from 'lodash';
import unzipPairs from './unzipPairs.js';

module.exports = function asSorted(timeValObject, fn) {
  const data = unzipPairs(timeValObject);
  return _.zipObject(fn(data));
};
