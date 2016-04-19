var d3 = require('d3');
var _ = require('lodash');

function valuator(v) {
  if (_.isFunction(v)) { return v; }
  if (_.isString(v) || _.isNumber(v)) {
    return function (d) { return d[v]; };
  }
  return d3.functor(v);
};

module.exports = valuator;
