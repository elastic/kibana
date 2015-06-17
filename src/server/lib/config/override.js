var _           = require('lodash');
var flattenWith = require('./flatten_with');
var explodeBy   = require('./explode_by');

module.exports = function (target, source) {
  var _target = flattenWith('.', target);
  var _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


