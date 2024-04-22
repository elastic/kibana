/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { useMemo } from 'react';
import { defaultRowLineHeight, ROWS_HEIGHT_OPTIONS } from '../constants';

interface UseRowHeightProps {
  rowHeightLines: number;
  rowLineHeight?: string;
}

/**
 * Converts rowHeight number (-1 to 20) of EuiDataGrid rowHeight
 */
const deserializeRowHeight = (number: number): EuiDataGridRowHeightOption | undefined => {
  if (number === ROWS_HEIGHT_OPTIONS.auto) {
    return 'auto';
  } else if (number === ROWS_HEIGHT_OPTIONS.single) {
    return undefined;
  }

  return { lineCount: number }; // custom
};

export const useRowHeightsOptions = ({
  rowHeightLines,
  rowLineHeight = defaultRowLineHeight,
}: UseRowHeightProps) => {
  return useMemo((): EuiDataGridRowHeightsOptions => {
    const defaultHeight = deserializeRowHeight(rowHeightLines);

    return {
      defaultHeight,
      lineHeight: rowLineHeight,
    };
  }, [rowHeightLines, rowLineHeight]);
};
