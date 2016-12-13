import _ from 'lodash';
import flattenWith from './flatten_with';
import explodeBy from './explode_by';

module.exports = function (target, source) {
  const _target = flattenWith('.', target);
  const _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


