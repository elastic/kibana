/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function createInitialQueryParametersState(
  defaultStepSize: number = 5,
  tieBreakerField: string = '_doc'
) {
  return {
    anchorId: null,
    columns: [],
    defaultStepSize,
    filters: [],
    indexPatternId: null,
    predecessorCount: 0,
    successorCount: 0,
    sort: [],
    tieBreakerField,
  };
}
