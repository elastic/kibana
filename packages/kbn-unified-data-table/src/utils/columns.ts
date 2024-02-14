/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// We store this outside the function as a constant, so we're not creating a new array every time
// the function is returning this. A changing array might cause the data grid to think it got
// new columns, and thus performing worse than using the same array over multiple renders.
const SOURCE_ONLY = ['_source'];

/**
 * Function to provide fallback when no columns are given
 */
export function getDisplayedColumns(stateColumns: string[] = []) {
  return stateColumns && stateColumns.length > 0 ? stateColumns : SOURCE_ONLY;
}

export function getInnerColumns(fields: Record<string, unknown[]>, columnId: string) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      return key.startsWith(`${columnId}.`);
    })
  );
}
