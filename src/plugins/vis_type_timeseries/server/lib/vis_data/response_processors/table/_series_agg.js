/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';

function mean(values) {
  return _.sum(values) / values.length;
}

const basic = (fnName) => (targetSeries) => {
  const data = [];
  _.zip(...targetSeries).forEach((row) => {
    const key = row[0][0];
    const values = row.map((r) => r[1]);
    const fn = _[fnName] || (() => null);
    data.push([key, fn(values)]);
  });
  return [data];
};

const overall = (fnName) => (targetSeries) => {
  const fn = _[fnName];
  const keys = [];
  const values = [];
  _.zip(...targetSeries).forEach((row) => {
    keys.push(row[0][0]);
    values.push(fn(row.map((r) => r[1])));
  });
  return [keys.map((k) => [k, fn(values)])];
};

export const SeriesAgg = {
  sum: basic('sum'),
  max: basic('max'),
  min: basic('min'),
  mean(targetSeries) {
    const data = [];
    _.zip(...targetSeries).forEach((row) => {
      const key = row[0][0];
      const values = row.map((r) => r[1]);
      data.push([key, mean(values)]);
    });
    return [data];
  },

  overall_max: overall('max'),
  overall_min: overall('min'),
  overall_sum: overall('sum'),

  overall_avg(targetSeries) {
    const fn = mean;
    const keys = [];
    const values = [];
    _.zip(...targetSeries).forEach((row) => {
      keys.push(row[0][0]);
      values.push(_.sum(row.map((r) => r[1])));
    });
    return [keys.map((k) => [k, fn(values)])];
  },

  cumulative_sum(targetSeries) {
    const data = [];
    let sum = 0;
    _.zip(...targetSeries).forEach((row) => {
      const key = row[0][0];
      sum += _.sum(row.map((r) => r[1]));
      data.push([key, sum]);
    });
    return [data];
  },
};
