/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFullyTransparent, withoutAlpha } from './annotations';

describe('withoutAlpha', () => {
  it.each([
    ['rgba(254, 80, 80, 0.4)', 'rgb(254, 80, 80)'],
    ['rgba(1,2,3,0.25)', 'rgb(1, 2, 3)'],
    ['#FE505066', '#FE5050'],
    ['#FE5050', '#FE5050'],
    ['rgb(1, 2, 3)', 'rgb(1, 2, 3)'],
    ['red', 'red'],
  ])('turns %s into %s', (color, expected) => {
    expect(withoutAlpha(color)).toBe(expected);
  });
});

describe('isFullyTransparent', () => {
  it.each([
    ['rgba(0, 0, 0, 0)', true],
    ['rgba(254, 80, 80, 0)', true],
    ['transparent', true],
    ['rgba(254, 80, 80, 0.4)', false],
    ['rgba(254, 80, 80, 1)', false],
    ['#FE5050', false],
  ])('says %s is %s', (color, expected) => {
    expect(isFullyTransparent(color)).toBe(expected);
  });
});
