import _ from 'lodash';
import flattenWith from './flattenWith';
import explodeBy from './explodeBy';

module.exports = function (target, source) {
  var _target = flattenWith('.', target);
  var _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


