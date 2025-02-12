/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SetRequired } from 'type-fest';
import React, { ComponentProps, useCallback } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { typedMemo } from '../utils/react';
import { AdditionalContext, AlertsTableProps, BulkActionsVerbs } from '../types';
import { ErrorBoundary } from './error_boundary';
import { ErrorCell } from './error_cell';

/**
 * Entry point for rendering actions cells (in control columns)
 */
export const ActionsCellHost = typedMemo(
  <AC extends AdditionalContext>(
    // The actions control column is active only when the user provided the `renderActionsCell` prop
    props: SetRequired<
      ComponentProps<NonNullable<AlertsTableProps<AC>['renderActionsCell']>>,
      'renderActionsCell'
    >
  ) => {
    const {
      rowIndex,
      pageSize,
      pageIndex,
      alerts,
      oldAlertsData,
      ecsAlertsData,
      bulkActionsStore,
      renderActionsCell: ActionsCell,
      visibleRowIndex,
    } = props;
    const idx = rowIndex - pageSize * pageIndex;
    const alert = alerts[idx];
    const legacyAlert = oldAlertsData[idx];
    const ecsAlert = ecsAlertsData[idx];
    const [, updateBulkActionsState] = bulkActionsStore;

    const setIsActionLoading = useCallback(
      (_isLoading: boolean = true) => {
        updateBulkActionsState({
          action: BulkActionsVerbs.updateRowLoadingState,
          rowIndex: visibleRowIndex,
          isLoading: _isLoading,
        });
      },
      [visibleRowIndex, updateBulkActionsState]
    );

    if (!alert) {
      return null;
    }

    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <ErrorBoundary fallback={ErrorCell}>
          <ActionsCell
            {...(props as ComponentProps<NonNullable<AlertsTableProps<AC>['renderActionsCell']>>)}
            alert={alert}
            legacyAlert={legacyAlert}
            ecsAlert={ecsAlert}
            setIsActionLoading={setIsActionLoading}
          />
        </ErrorBoundary>
      </EuiFlexGroup>
    );
  }
);
