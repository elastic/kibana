/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext, useEffect, useMemo } from 'react';
import { EuiDataGridCellValueElementProps, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../table_context';

export const useControlColumn = ({
  rowIndex,
  setCellProps,
}: Pick<EuiDataGridCellValueElementProps, 'rowIndex' | 'setCellProps'>): {
  record?: DataTableRecord;
  rowIndex: number;
} => {
  const { expanded, getRowByIndex } = useContext(UnifiedDataTableContext);
  const record = useMemo(() => getRowByIndex(rowIndex), [getRowByIndex, rowIndex]);
  const { euiTheme } = useEuiTheme();
  const { backgroundBasePrimary: anchorColor } = euiTheme.colors;

  useEffect(() => {
    if (record?.isAnchor) {
      setCellProps({
        className: 'unifiedDataTable__cell--highlight',
        css: { backgroundColor: anchorColor },
      });
    } else if (expanded && record && expanded.id === record.id) {
      setCellProps({
        className: 'unifiedDataTable__cell--expanded',
      });
    } else {
      setCellProps({
        className: '',
      });
    }
  }, [expanded, record, setCellProps, anchorColor]);

  return useMemo(() => ({ record, rowIndex }), [record, rowIndex]);
};
