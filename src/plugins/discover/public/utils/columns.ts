/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';

// We store this outside the function as a constant, so we're not creating a new array every time
// the function is returning this. A changing array might cause the data grid to think it got
// new columns, and thus performing worse than using the same array over multiple renders.
const SOURCE_ONLY = ['_source'];

/**
 * Function to provide fallback when
 * 1) no columns are given
 * 2) Just one column is given, which is the configured timefields
 */
export function getDisplayedColumns(stateColumns: string[] = [], indexPattern: DataView) {
  return stateColumns &&
    stateColumns.length > 0 &&
    // check if all columns where removed except the configured timeField (this can't be removed)
    !(stateColumns.length === 1 && stateColumns[0] === indexPattern.timeFieldName)
    ? stateColumns
    : SOURCE_ONLY;
}
