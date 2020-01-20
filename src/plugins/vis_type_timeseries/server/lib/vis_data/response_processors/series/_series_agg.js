/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

function mean(values) {
  return _.sum(values) / values.length;
}

const extractValue = r => (r && r[1]) || 0;

const basic = fnName => targetSeries => {
  const data = [];
  _.zip(...targetSeries).forEach(row => {
    const key = row[0][0];
    const values = row.map(extractValue);
    const fn = _[fnName] || (() => null);
    data.push([key, fn(values)]);
  });
  return [data];
};

const overall = fnName => targetSeries => {
  const fn = _[fnName];
  const keys = [];
  const values = [];
  _.zip(...targetSeries).forEach(row => {
    keys.push(row[0][0]);
    values.push(fn(row.map(extractValue)));
  });
  return [keys.map(k => [k, fn(values)])];
};

export const SeriesAgg = {
  sum: basic('sum'),
  max: basic('max'),
  min: basic('min'),
  mean(targetSeries) {
    const data = [];
    _.zip(...targetSeries).forEach(row => {
      const key = row[0][0];
      const values = row.map(extractValue);
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
    _.zip(...targetSeries).forEach(row => {
      keys.push(row[0][0]);
      values.push(_.sum(row.map(extractValue)));
    });
    return [keys.map(k => [k, fn(values)])];
  },

  cumulative_sum(targetSeries) {
    const data = [];
    let sum = 0;
    _.zip(...targetSeries).forEach(row => {
      const key = row[0][0];
      sum += _.sum(row.map(extractValue));
      data.push([key, sum]);
    });
    return [data];
  },
};
