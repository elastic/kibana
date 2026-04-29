/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RowsVirtualIndexes } from './rows_virtual_indexes';

describe('RowsVirtualIndexes', () => {
  let rowsVirtualIndexes: RowsVirtualIndexes;

  beforeEach(() => {
    rowsVirtualIndexes = new RowsVirtualIndexes();
  });

  it('should add a row virtual index', () => {
    rowsVirtualIndexes.addRowVirtualIndex('row1', 0);
    expect(rowsVirtualIndexes.getRowVirtualIndex('row1')).toBe(0);
  });

  it('should recalculate other placeholder rows indexes if new row is added before them', () => {
    rowsVirtualIndexes.addRowVirtualIndex('row1', 0);
    rowsVirtualIndexes.addRowVirtualIndex('row2', 0);
    expect(rowsVirtualIndexes.getRowVirtualIndex('row1')).toBe(1);
    expect(rowsVirtualIndexes.getRowVirtualIndex('row2')).toBe(0);
  });

  it('should update virtual indexes after a row deletion', () => {
    rowsVirtualIndexes.addRowVirtualIndex('row1', 0);
    rowsVirtualIndexes.addRowVirtualIndex('row2', 1);
    rowsVirtualIndexes.deleteVirtualIndexByRowId('row1');
    rowsVirtualIndexes.updateVirtualIndexesAfterDeletion(0);
    expect(rowsVirtualIndexes.getRowVirtualIndex('row2')).toBe(0);
  });

  it('should delete a virtual index by row id', () => {
    rowsVirtualIndexes.addRowVirtualIndex('row1', 0);
    rowsVirtualIndexes.deleteVirtualIndexByRowId('row1');
    expect(rowsVirtualIndexes.getRowVirtualIndex('row1')).toBeUndefined();
  });

  it('should clear all virtual indexes', () => {
    rowsVirtualIndexes.addRowVirtualIndex('row1', 0);
    rowsVirtualIndexes.clear();
    expect(rowsVirtualIndexes.getRowVirtualIndex('row1')).toBeUndefined();
  });
});
