/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useContext, useEffect, useMemo } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../table_context';

export const useControlColumn = ({
  rowIndex,
  setCellProps,
}: Pick<EuiDataGridCellValueElementProps, 'rowIndex' | 'setCellProps'>): {
  record: DataTableRecord;
  rowIndex: number;
} => {
  const { expanded, rows } = useContext(UnifiedDataTableContext);
  const record = useMemo(() => rows[rowIndex], [rows, rowIndex]);

  useEffect(() => {
    if (record.isAnchor) {
      setCellProps({
        className: 'unifiedDataTable__cell--highlight',
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
  }, [expanded, record, setCellProps]);

  return useMemo(() => ({ record, rowIndex }), [record, rowIndex]);
};
