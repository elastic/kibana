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

import { MetricsCollector } from './';

const { sumAccumulate } = MetricsCollector;

describe('Accumulate By Summing Metrics', function () {
  it('should accumulate empty object with nothing as nothing', () => {
    const accum = { blues: {} };
    const current = sumAccumulate('blues', accum, {});
    expect(current).toEqual(undefined);
  });

  it('should return data to merge with initial empty data', () => {
    let accum = { blues: {} };
    const next = { blues: { total: 1 } };
    const accumulated = sumAccumulate('blues', accum, next);
    accum = { ...accum, blues: accumulated };
    expect(accum).toEqual({ blues: { total: 1 } });
  });

  it('should return data to merge with already accumulated data', () => {
    let currentProp;
    let accumulated;

    // initial
    let accum = {
      reds: 1,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 3, total: 5 },
      indigos: { total: 6 },
      violets: { total: 7 },
    };

    // first accumulation - existing nested object
    currentProp = 'blues';
    accumulated = sumAccumulate(currentProp, accum, {
      [currentProp]: { likes: 2, total: 2 },
    });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 1,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
    });

    // second accumulation - existing non-nested object
    currentProp = 'reds';
    accumulated = sumAccumulate(currentProp, accum, { [currentProp]: 2 });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 3,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
    });

    // third accumulation - new nested object prop
    currentProp = 'ultraviolets';
    accumulated = sumAccumulate(currentProp, accum, {
      [currentProp]: { total: 1, likes: 1, dislikes: 0 },
    });
    accum = { ...accum, [currentProp]: accumulated };
    expect(accum).toEqual({
      reds: 3,
      oranges: { total: 2 },
      yellows: { total: 3 },
      greens: { total: 4 },
      blues: { dislikes: 2, likes: 5, total: 7 },
      indigos: { total: 6 },
      violets: { total: 7 },
      ultraviolets: { dislikes: 0, likes: 1, total: 1 },
    });
  });
});
