/*
* Algorithms from
* copyright(c) 2013 Tom Alexander
* Licensed under the MIT license.
*/

var _ = require('lodash');

function sum(data, fn) {
  return _.reduce(data, function (sum, d) {
    return sum + (d[1] == null ? 0 : fn(d));
  }, 0);
}

function count(data) {
  return _.filter(data, function (d) {
    return d[1] == null ? false : true;
  }).length;
}

function mapTuples(data, fn) {
  return _.map(data, function (d) {
    return [d[0], fn(d)];
  });
}

export function linear(data) {
  var xSum    = sum(data, (d) => {return d[0]; });
  var ySum    = sum(data, (d) => {return d[1]; });
  var xSqSum  = sum(data, (d) => {return d[0] * d[0]; });
  var xySum   = sum(data, (d) => {return d[0] * d[1]; });
  var observations = count(data);

  var gradient =
    ((observations * xySum)  - (xSum * ySum)) /
    ((observations * xSqSum) - (xSum * xSum));

  var intercept =
    (ySum / observations) - (gradient * xSum) / observations;

  return mapTuples(data, (d) => { return d[0] * gradient + intercept; });
}

export function log(data) {
  var logXSum   = sum(data, (d) => {return Math.log(d[0]); });
  var yLogXSum  = sum(data, (d) => {return d[1] * Math.log(d[0]); });
  var ySum      = sum(data, (d) => {return d[1]; });
  var logXsqSum = sum(data, (d) => {return Math.pow(Math.log(d[0]), 2); });
  var observations = count(data);

  var b =
    ((observations * yLogXSum) -  (ySum * logXSum)) /
    ((observations * logXsqSum) - (logXSum * logXSum));

  var a =
    (ySum - b * logXSum) /
    observations;

  return mapTuples(data, (d) => { return a + b * Math.log(d[0]); });
}
