/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption } from '@elastic/eui';

export type SerializedRowHeight = 'auto' | number;

const SINGLE_ROW_HEIGHT = 1;

const isAutoOption = (option?: EuiDataGridRowHeightOption): option is 'auto' => {
  if (option === 'auto') {
    return true;
  }
  return false;
};

const isLineOption = (option?: EuiDataGridRowHeightOption): option is { lineCount: number } => {
  if (typeof option === 'object' && option.lineCount) {
    return true;
  }
  return false;
};

export const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): SerializedRowHeight => {
  if (isAutoOption(rowHeight)) {
    return 'auto';
  } else if (isLineOption(rowHeight)) {
    return rowHeight.lineCount;
  }

  // When defaultHeight is undefined, single row option enabled
  return SINGLE_ROW_HEIGHT;
};

export const deserializeRowHeight = (
  serializedRowHeight?: SerializedRowHeight
): EuiDataGridRowHeightOption | undefined => {
  if (isAutoOption(serializedRowHeight)) {
    return 'auto';
  } else if (serializedRowHeight) {
    return { lineCount: serializedRowHeight };
  }
};
