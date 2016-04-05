import _ from 'lodash';
import flattenWith from './flatten_with';
import explodeBy from './explode_by';

module.exports = function (target, source) {
  let _target = flattenWith('.', target);
  let _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


