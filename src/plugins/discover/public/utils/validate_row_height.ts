/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedRowHeight } from './use_data_grid_options';

const MIN_ROW_HEIGHT = -1;
const MAX_ROW_HEIGHT = 20;

export const isValidRowHeight = (rowHeight?: SerializedRowHeight) => {
  return (
    typeof rowHeight === 'number' &&
    !Number.isNaN(rowHeight) &&
    rowHeight >= MIN_ROW_HEIGHT &&
    rowHeight <= MAX_ROW_HEIGHT
  );
};
