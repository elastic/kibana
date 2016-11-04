/*
* Algorithms from
* copyright(c) 2013 Tom Alexander
* Licensed under the MIT license.
*/

let _ = require('lodash');

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
  let xSum    = sum(data, (d) => {return d[0]; });
  let ySum    = sum(data, (d) => {return d[1]; });
  let xSqSum  = sum(data, (d) => {return d[0] * d[0]; });
  let xySum   = sum(data, (d) => {return d[0] * d[1]; });
  let observations = count(data);

  let gradient =
    ((observations * xySum)  - (xSum * ySum)) /
    ((observations * xSqSum) - (xSum * xSum));

  let intercept =
    (ySum / observations) - (gradient * xSum) / observations;

  return mapTuples(data, (d) => { return d[0] * gradient + intercept; });
}

export function log(data) {
  let logXSum   = sum(data, (d) => {return Math.log(d[0]); });
  let yLogXSum  = sum(data, (d) => {return d[1] * Math.log(d[0]); });
  let ySum      = sum(data, (d) => {return d[1]; });
  let logXsqSum = sum(data, (d) => {return Math.pow(Math.log(d[0]), 2); });
  let observations = count(data);

  let b =
    ((observations * yLogXSum) -  (ySum * logXSum)) /
    ((observations * logXsqSum) - (logXSum * logXSum));

  let a =
    (ySum - b * logXSum) /
    observations;

  return mapTuples(data, (d) => { return a + b * Math.log(d[0]); });
}
