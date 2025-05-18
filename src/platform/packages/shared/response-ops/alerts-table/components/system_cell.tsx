/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
import { ALERT_STATUS, ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import type { CellComponent, SystemCellComponentMap, SystemCellId } from '../types';
import { DefaultCell } from './default_cell';
import { AlertLifecycleStatusCell } from './alert_lifecycle_status_cell';
import { CasesCell } from './cases_cell';
import { MaintenanceWindowsCell } from './maintenance_windows_cell';

export const systemCells: SystemCellId[] = [
  ALERT_STATUS,
  ALERT_CASE_IDS,
  ALERT_MAINTENANCE_WINDOW_IDS,
];

export const SystemCell: CellComponent = memo((props) => {
  const columnId = props.columnId as SystemCellId;
  const cellComponents: SystemCellComponentMap = useMemo(
    () => ({
      [ALERT_STATUS]: AlertLifecycleStatusCell,
      [ALERT_CASE_IDS]: CasesCell,
      [ALERT_MAINTENANCE_WINDOW_IDS]: MaintenanceWindowsCell,
    }),
    []
  );

  if (cellComponents[columnId]) {
    const CellComponent = cellComponents[columnId];
    return <CellComponent {...props} />;
  }

  return <DefaultCell {...props} />;
});
