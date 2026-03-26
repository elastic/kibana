/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Utility class to manage virtual indexes of newly added rows (not yet saved).
 * This is needed to keep track of the correct position of new rows when multiple new rows are added/deleted.
 * And preserve the position where the user added them.
 */
export class RowsVirtualIndexes {
  private rowsVirtualIndexes: Record<string, number> = {};

  /**
   * If a new row is added before other new rows, their virtual indexes should be incremented.
   */
  public addRowVirtualIndex(id: string, atIndex: number) {
    // Recalculate other placeholder rows indexes if new row is added before them
    Object.entries(this.rowsVirtualIndexes).forEach(([rowId, index]) => {
      if (index >= atIndex) {
        this.rowsVirtualIndexes[rowId] += 1;
      }
    });

    this.rowsVirtualIndexes[id] = atIndex;
  }

  /**
   * Updates virtual indexes after a row deletion.
   * If a row is deleted, all virtual indexes after it should be decremented by 1.
   */
  public updateVirtualIndexesAfterDeletion(index: number) {
    // Recalculate other placeholder rows indexes if row is removed
    Object.entries(this.rowsVirtualIndexes).forEach(([rowId, rowIndex]) => {
      if (rowIndex >= index) {
        this.rowsVirtualIndexes[rowId] -= 1;
      }
    });
  }

  public deleteVirtualIndexByRowId(id: string) {
    delete this.rowsVirtualIndexes[id];
  }

  public clear() {
    this.rowsVirtualIndexes = {};
  }

  public getRowVirtualIndex(id: string): number | undefined {
    return this.rowsVirtualIndexes[id];
  }
}
