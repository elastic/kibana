/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const generateMockData = (rowsCount: number, columnsCount: number) => {
  const testData: string[][] = [];

  Array.from({ length: rowsCount }).forEach((_, i) => {
    const row: string[] = [];
    Array.from({ length: columnsCount }).forEach((__, j) => {
      row.push(`cell-in-row-${i}-col-${j}`);
    });
    testData.push(row);
  });

  return testData;
};
