/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getGroupDependencies, getGroupedSizeMap } from './generate_weighted_dot_file';

import { getFontColor, CURR_COLOR_SCHEME } from './styles';
it('getFontColor light', () => {
  expect(getFontColor(CURR_COLOR_SCHEME[0])).toBe(CURR_COLOR_SCHEME[4]);
});

it('getFontColor dark', () => {
  expect(getFontColor(CURR_COLOR_SCHEME[4])).toBe(CURR_COLOR_SCHEME[0]);
});

it('getGroupDependencies', () => {
  const dependencies = {
    A: {
      B: 4,
      C: 6,
    },
    B: {
      C: 10,
    },
  };

  const higherGrouping = {
    One: ['A', 'B'],
    Two: ['C'],
  };
  const groupDeps = getGroupDependencies(dependencies, higherGrouping);

  // A -> C + B -> C = 6 + 10 = 16
  expect(groupDeps.One.Two).toBe(16);
  // C doesn't relate to any
  expect(groupDeps.Two).toBe(undefined);
});

it('getGroupedSizeMap', () => {
  const grouping = {
    One: ['a', 'AA', 'aa'],
    Two: ['b', 'BBB', 'B'],
  };
  const sizes = {
    a: 1,
    AA: 5,
    aa: 10,
    b: 3,
    BBB: 9,
    B: 10,
  };
  const biggerGroupSizes = getGroupedSizeMap(grouping, sizes);
  expect(biggerGroupSizes.One).toBe(16);
  expect(biggerGroupSizes.Two).toBe(22);
});
