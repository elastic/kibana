/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/*
 * Accepts an array of x axis values (strings or numbers).
 * Returns a zero filled array.
 */
export function createZeroFilledArray(arr, label) {
  if (!Array.isArray(arr)) {
    throw new Error('createZeroFilledArray expects an array of strings or numbers');
  }

  const zeroFilledArray = [];

  arr.forEach(function (val) {
    zeroFilledArray.push({
      x: val,
      xi: Infinity,
      y: 0,
      series: label,
    });
  });

  return zeroFilledArray;
}
