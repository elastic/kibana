/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonText } from '@elastic/eui';
import React from 'react';
import { GetAlertsTableProp, SystemCellId } from '../types';
import { DefaultCellValue } from './default_cell_value';
import { SystemCell, systemCells } from './system_cell';
import { ErrorBoundary } from './error_boundary';
import { ErrorCell } from './error_cell';

/**
 * Entry point for rendering cell values
 *
 * Renders a SystemCell for cases, maintenance windows, and alert status, the `renderCellValue`
 * provided in the `AlertsTableProps` for other fields or the default cell value renderer otherwise.
 * When the alerts or the related cases or maintenance windows are loading, a skeleton text is rendered.
 */
export const CellValueHost: GetAlertsTableProp<'renderCellValue'> = (props) => {
  const {
    columnId,
    renderCellValue: CellValue = DefaultCellValue,
    isLoading,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    cases,
    maintenanceWindows,
    showAlertStatusWithFlapping,
    casesConfig,
    rowIndex,
    pageIndex,
    pageSize,
  } = props;
  const idx = rowIndex - pageSize * pageIndex;
  const alert = alerts[idx];
  const legacyAlert = oldAlertsData[idx];
  const ecsAlert = ecsAlertsData[idx];
  if (isSystemCell(columnId) && alert) {
    return (
      <SystemCell
        {...props}
        alert={alert}
        columnId={columnId}
        isLoading={isLoading}
        cases={cases}
        maintenanceWindows={maintenanceWindows}
        showAlertStatusWithFlapping={showAlertStatusWithFlapping ?? false}
        caseAppId={casesConfig?.appId}
      />
    );
  }
  if (alert) {
    return (
      <ErrorBoundary fallback={ErrorCell}>
        <CellValue {...props} alert={alert} legacyAlert={legacyAlert} ecsAlert={ecsAlert} />
      </ErrorBoundary>
    );
  }
  if (isLoading) {
    return <EuiSkeletonText lines={1} />;
  }
  return null;
};

const isSystemCell = (columnId: string): columnId is SystemCellId => {
  return systemCells.includes(columnId as SystemCellId);
};
