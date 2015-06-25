var _ = require('lodash');
var flattenWith = require('./flattenWith');
var explodeBy = require('./explodeBy');

module.exports = function (target, source) {
  var _target = flattenWith('.', target);
  var _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


