/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import memoizeOne from 'memoize-one';
import { useMemo } from 'react';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { selectLoadedEntries } from '../../state_machines/data_access_state_machine';

export function LogExplorerCell({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
  const { startRowIndex, endRowIndex, entries } = useSelector(
    useStateMachineContext(),
    memoizedSelectLoadedEntries
  );

  const entry = useMemo(
    () =>
      startRowIndex != null &&
      endRowIndex != null &&
      rowIndex >= startRowIndex &&
      rowIndex <= endRowIndex
        ? entries[rowIndex - startRowIndex]
        : undefined,
    [endRowIndex, entries, rowIndex, startRowIndex]
  );

  if (entry == null) {
    return '';
  }

  return JSON.stringify({ entry });
}

const memoizedSelectLoadedEntries = memoizeOne(selectLoadedEntries);
