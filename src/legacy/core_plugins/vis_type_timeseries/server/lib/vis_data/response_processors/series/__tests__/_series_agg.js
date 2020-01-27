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

import { expect } from 'chai';
import { SeriesAgg as seriesAgg } from '../_series_agg';

describe('seriesAgg', () => {
  const series = [
    [
      [0, 2],
      [1, 1],
      [2, 3],
    ],
    [
      [0, 4],
      [1, 2],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 3],
    ],
  ];

  describe('basic', () => {
    it('returns the series sum', () => {
      expect(seriesAgg.sum(series)).to.eql([
        [
          [0, 8],
          [1, 4],
          [2, 9],
        ],
      ]);
    });

    it('returns the series max', () => {
      expect(seriesAgg.max(series)).to.eql([
        [
          [0, 4],
          [1, 2],
          [2, 3],
        ],
      ]);
    });

    it('returns the series min', () => {
      expect(seriesAgg.min(series)).to.eql([
        [
          [0, 2],
          [1, 1],
          [2, 3],
        ],
      ]);
    });

    it('returns the series mean', () => {
      expect(seriesAgg.mean(series)).to.eql([
        [
          [0, 8 / 3],
          [1, 4 / 3],
          [2, 3],
        ],
      ]);
    });
  });

  describe('overall', () => {
    it('returns the series overall sum', () => {
      expect(seriesAgg.overall_sum(series)).to.eql([
        [
          [0, 21],
          [1, 21],
          [2, 21],
        ],
      ]);
    });

    it('returns the series overall max', () => {
      expect(seriesAgg.overall_max(series)).to.eql([
        [
          [0, 4],
          [1, 4],
          [2, 4],
        ],
      ]);
    });

    it('returns the series overall min', () => {
      expect(seriesAgg.overall_min(series)).to.eql([
        [
          [0, 1],
          [1, 1],
          [2, 1],
        ],
      ]);
    });

    it('returns the series overall mean', () => {
      const value = (8 + 4 + 9) / 3;
      expect(seriesAgg.overall_avg(series)).to.eql([
        [
          [0, value],
          [1, value],
          [2, value],
        ],
      ]);
    });
  });

  describe('cumulative sum', () => {
    it('returns the series cumulative sum', () => {
      expect(seriesAgg.cumulative_sum(series)).to.eql([
        [
          [0, 8],
          [1, 12],
          [2, 21],
        ],
      ]);
    });
  });
});
