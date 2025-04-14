/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGridCellPopoverElementProps } from '@elastic/eui/src/components/datagrid/data_grid_types';
import React from 'react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { ErrorBoundary } from './error_boundary';
import { ErrorCell } from './error_cell';

/**
 * Entry point for rendering cell popovers
 *
 * Wraps the provided `CellPopover` with an `ErrorBoundary` to catch any errors
 */
export const CellPopoverHost = (props: EuiDataGridCellPopoverElementProps) => {
  const { rowIndex, DefaultCellPopover } = props;
  const renderContext = useAlertsTableContext();
  const { pageSize, pageIndex, alerts, renderCellPopover: CellPopover } = renderContext;

  const idx = rowIndex - pageSize * pageIndex;
  const alert = alerts[idx];
  if (alert && CellPopover) {
    return (
      <ErrorBoundary fallback={ErrorCell}>
        <CellPopover {...renderContext} {...props} alert={alert} />
      </ErrorBoundary>
    );
  }

  return <DefaultCellPopover {...props} />;
};
