/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { hsl } from 'color';

import { seedColors } from './seed_colors';

const offset = 300; // Hue offset to start at

const fraction = function (goal: number) {
  const walkTree = (numerator: number, denominator: number, bytes: number[]): number => {
    if (bytes.length) {
      return walkTree(numerator * 2 + (bytes.pop() ? 1 : -1), denominator * 2, bytes);
    } else {
      return numerator / denominator;
    }
  };

  const b = (goal + 2)
    .toString(2)
    .split('')
    .map(function (num) {
      return parseInt(num, 10);
    });
  b.shift();

  return walkTree(1, 2, b);
};

/**
 * Generates an array of hex colors the length of the input number.
 * If the number is greater than the length of seed colors available,
 * new colors are generated up to the value of the input number.
 */
export function createColorPalette(num: number): string[] {
  if (!_.isNumber(num)) {
    throw new TypeError('ColorPaletteUtilService expects a number');
  }

  const colors = seedColors;
  const seedLength = seedColors.length;

  _.times(num - seedLength, function (i) {
    colors.push(hsl((fraction(i + seedLength + 1) * 360 + offset) % 360, 50, 50).hex());
  });

  return colors;
}
