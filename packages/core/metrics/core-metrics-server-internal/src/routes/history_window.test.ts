/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HistoryWindow } from './history_window';

describe('HistoryWindow', () => {
  it('#getAverage should work without any observations', () => {
    const hw = new HistoryWindow(3);
    expect(hw.getAverage(1)).toBe(0);
  });

  it('Window size remains constant', () => {
    const hw = new HistoryWindow(7);
    for (let i = 0; i < 100; i++) {
      hw.addObservation(i);
      expect(hw.size).toBe(7);
    }
  });
  it.each([
    [-1000],
    [-1],
    [0],
    [9999],
    // [NaN] assuming this is nonsense input
  ])('#getAverage works given bad input: %s', (badInput) => {
    const hw = new HistoryWindow(3);
    expect(hw.getAverage(badInput)).toBe(0);
  });

  const WINDOW_SIZE = 3;
  it.each([
    { name: 'base case', observations: [0.44, 0.55, 0.66], averageLast: 3, expected: 0.55 },
    {
      name: 'reverse base case',
      observations: [0.44, 0.55, 0.66].reverse(),
      averageLast: 3,
      expected: 0.55,
    }, // should be same as above
    {
      name: 'include one observation',
      observations: [0.44, 0.55, 0.66],
      averageLast: 1,
      expected: 0.44,
    },
    {
      name: 'include excess observations',
      observations: [0.201, 0.33, 0.44],
      averageLast: 4,
      expected: 0.33,
    },
    {
      name: 'subset of observations',
      observations: [0.44, 0.55, 0.66],
      averageLast: 2,
      expected: 0.5,
    },
    {
      name: 'includes at least one observation',
      observations: [0.44, 0.55, 0.66],
      averageLast: -1,
      expected: 0.44,
    },
    {
      name: 'excess observations',
      observations: [1, 0.99, 0.55, 0.66, 0.44, 0.55, 0.66, 0.77],
      averageLast: 1000,
      expected: 0.85,
    },
    {
      name: 'bad observation data',
      observations: [-1, -0.99, -0.55, -0.66, -0.44],
      averageLast: 10000,
      expected: 0,
    },
  ])('$name', ({ observations, averageLast, expected }) => {
    const lw = new HistoryWindow(WINDOW_SIZE);
    // reverse so that our test observations are in the order they appear above
    for (const observation of observations.reverse()) {
      lw.addObservation(observation);
    }
    expect(lw.getAverage(averageLast)).toBe(expected);
  });
});
