/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Algorithms from
 * copyright(c) 2013 Tom Alexander
 * Licensed under the MIT license.
 */

import _ from 'lodash';

function sum(data, fn) {
  return _.reduce(
    data,
    function (sum, d) {
      return sum + (d[1] == null ? 0 : fn(d));
    },
    0
  );
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
  const xSum = sum(data, (d) => {
    return d[0];
  });
  const ySum = sum(data, (d) => {
    return d[1];
  });
  const xSqSum = sum(data, (d) => {
    return d[0] * d[0];
  });
  const xySum = sum(data, (d) => {
    return d[0] * d[1];
  });
  const observations = count(data);

  const gradient = (observations * xySum - xSum * ySum) / (observations * xSqSum - xSum * xSum);

  const intercept = ySum / observations - (gradient * xSum) / observations;

  return mapTuples(data, (d) => {
    return d[0] * gradient + intercept;
  });
}

export function log(data) {
  const logXSum = sum(data, (d) => {
    return Math.log(d[0]);
  });
  const yLogXSum = sum(data, (d) => {
    return d[1] * Math.log(d[0]);
  });
  const ySum = sum(data, (d) => {
    return d[1];
  });
  const logXsqSum = sum(data, (d) => {
    return Math.pow(Math.log(d[0]), 2);
  });
  const observations = count(data);

  const b =
    (observations * yLogXSum - ySum * logXSum) / (observations * logXsqSum - logXSum * logXSum);

  const a = (ySum - b * logXSum) / observations;

  return mapTuples(data, (d) => {
    return a + b * Math.log(d[0]);
  });
}
