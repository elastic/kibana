/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { IndexPattern } from '../../../../data/common';

/**
 * Function to provide fallback when
 * 1) no columns are given
 * 2) Just one column is given, which is the configured timefields
 */
export function getDisplayedColumns(stateColumns: string[] = [], indexPattern: IndexPattern) {
  return stateColumns &&
    stateColumns.length > 0 &&
    // check if all columns where removed except the configured timeField (this can't be removed)
    !(stateColumns.length === 1 && stateColumns[0] === indexPattern.timeFieldName)
    ? stateColumns
    : ['_source'];
}
