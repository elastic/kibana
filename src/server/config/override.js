let _ = require('lodash');
let flattenWith = require('./flattenWith');
let explodeBy = require('./explodeBy');

module.exports = function (target, source) {
  let _target = flattenWith('.', target);
  let _source = flattenWith('.', source);
  return explodeBy('.', _.defaults(_source, _target));
};


