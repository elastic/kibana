/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { useStateMachineContext } from '../../hooks/query_data/use_state_machine';
import { memoizedSelectRows } from '../../state_machines/data_access_state_machine';

export function LogExplorerCell({ rowIndex, columnId }: EuiDataGridCellValueElementProps) {
  const { rows } = useSelector(useStateMachineContext(), memoizedSelectRows);

  const row = rows.get(rowIndex);

  if (row == null) {
    return '';
  }

  // TODO: render based on row.type and columnId

  return JSON.stringify(row);
}
