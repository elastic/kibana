import d3 from 'd3';
import _ from 'lodash';

function valuator(v) {
  if (_.isFunction(v)) { return v; }
  if (_.isString(v) || _.isNumber(v)) {
    return function (d) { return d[v]; };
  }
  return d3.functor(v);
};

export default valuator;
