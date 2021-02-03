/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function geohashColumns(precision: number): number {
  return geohashCells(precision, 0);
}

/**
 * Get the number of geohash cells for a given precision
 *
 * @param {number} precision the geohash precision (1<=precision<=12).
 * @param {number} axis constant for the axis 0=lengthwise (ie. columns, along longitude), 1=heightwise (ie. rows, along latitude).
 * @returns {number} Number of geohash cells (rows or columns) at that precision
 */
function geohashCells(precision: number, axis: number) {
  let cells = 1;
  for (let i = 1; i <= precision; i += 1) {
    /* On odd precisions, rows divide by 4 and columns by 8. Vice-versa on even precisions */
    cells *= i % 2 === axis ? 4 : 8;
  }
  return cells;
}
