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

const fn = require(`src/plugins/timelion/server/series_functions/movingstd`);

import moment from 'moment';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';
import getSeries from './helpers/get_series';
import getSeriesList from './helpers/get_series_list';

describe('movingstd.js', () => {

  it('computes the moving standard deviation of a list', async () => {
    const points = [
      108.48, 111.56, 112.13, 113.75, 114.25, 110.79, 111.21, 116.82, 117.16, 120.38, 116.96,
      119.56, 118.97, 117.54, 114.42, 111.01, 114.20, 116.43, 117.74, 119.90, 124.65, 124.98,
      124.70, 123.60, 124.5, 126.85];
    const buckets = [];
    buckets[0] = moment('2018-01-01T00:00:00.000Z');
    for (let i = 1; i < points.length; i++) {
      buckets[i] = buckets[i - 1].add(1, 'hours');
    }
    const series = getSeries('test data', buckets, points);
    const seriesList = getSeriesList([series]);
    const numWindows = 5;
    const position = 'left';
    const results = await invoke(fn, [seriesList, numWindows, position]);

    const resultPoints = results.output.list[0].data.map((row) => {
      // row is an array; index 0 is the time bucket, index 1 is the value
      return row[1];
    });
    // First 5 result buckets are null since moving window is filling up.
    const trimmedResultPoints = resultPoints.slice(numWindows);

    const expectedPoints = [
      2.28, 1.46, 1.53, 2.46, 3.00, 4.14, 3.31, 1.67, 1.50, 1.41,
      2.01, 3.56, 3.12, 2.50, 2.56, 3.41, 3.97, 3.92, 3.35, 2.12, 0.52];

    expectedPoints.forEach((value, index) => {
      expect(trimmedResultPoints[index]).to.be.within(value - 0.01, value + 0.01);
    });
  });

});
