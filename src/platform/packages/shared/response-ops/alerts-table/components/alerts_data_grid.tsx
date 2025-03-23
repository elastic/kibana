/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, lazy, Suspense, useCallback, useMemo } from 'react';
import {
  EuiDataGrid,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridStyle,
  RenderCellValue,
  tint,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { ActionsCellHost } from './actions_cell_host';
import { ControlColumnHeaderCell } from './control_column_header_cell';
import { CellValueHost } from './cell_value_host';
import { BulkActionsCell } from './bulk_actions_cell';
import { BulkActionsHeader } from './bulk_actions_header_cell';
import { AdditionalContext, AlertsDataGridProps, CellActionsOptions } from '../types';
import { useGetToolbarVisibility } from '../hooks/use_toolbar_visibility';
import { InspectButtonContainer } from './alerts_query_inspector';
import { typedMemo } from '../utils/react';
import type { AlertsFlyout as AlertsFlyoutType } from './alerts_flyout';
import { useBulkActions } from '../hooks/use_bulk_actions';
import { useSorting } from '../hooks/use_sorting';
import { CellPopoverHost } from './cell_popover_host';
import { NonVirtualizedGridBody } from './non_virtualized_grid_body';

const AlertsFlyout = lazy(() => import('./alerts_flyout')) as typeof AlertsFlyoutType;

const defaultGridStyle: EuiDataGridStyle = {
  border: 'none',
  header: 'underline',
  fontSize: 's',
};
const defaultCellActionsOptions: CellActionsOptions = {
  getCellActionsForColumn: () => [],
  disabledCellActions: [],
};
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_ACTIONS_COLUMN_WIDTH = 75;
const stableMappedRowClasses: EuiDataGridStyle['rowClasses'] = {};

export const AlertsDataGrid = typedMemo(
  <AC extends AdditionalContext>(props: AlertsDataGridProps<AC>) => {
    const {
      ruleTypeIds,
      query,
      visibleColumns,
      onToggleColumn,
      onResetColumns,
      onChangeVisibleColumns,
      onColumnResize,
      showInspectButton = false,
      leadingControlColumns: additionalLeadingControlColumns,
      trailingControlColumns,
      onSortChange,
      sort: sortingFields,
      rowHeightsOptions,
      dynamicRowHeight,
      alertsQuerySnapshot,
      additionalToolbarControls,
      toolbarVisibility: toolbarVisibilityProp,
      shouldHighlightRow,
      renderContext,
      hideBulkActions,
      casesConfiguration,
      flyoutAlertIndex,
      setFlyoutAlertIndex,
      onPaginateFlyout,
      onChangePageSize,
      onChangePageIndex,
      actionsColumnWidth = DEFAULT_ACTIONS_COLUMN_WIDTH,
      getBulkActions,
      fieldsBrowserOptions,
      cellActionsOptions,
      pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
      height,
      ...euiDataGridProps
    } = props;
    const {
      isLoading,
      alerts,
      alertsCount,
      isLoadingAlerts,
      browserFields,
      renderActionsCell,
      pageIndex,
      pageSize,
      refresh: refreshQueries,
      columns,
      dataGridRef,
      services: { http, notifications, application, cases: casesService, settings },
    } = renderContext;

    const { colorMode } = useEuiTheme();
    const { sortingColumns, onSort } = useSorting(onSortChange, visibleColumns, sortingFields);
    const {
      isBulkActionsColumnActive,
      bulkActionsState,
      bulkActions,
      setIsBulkActionsLoading,
      clearSelection,
    } = useBulkActions({
      ruleTypeIds,
      query,
      alertsCount: alerts.length,
      casesConfig: casesConfiguration,
      getBulkActions,
      refresh: refreshQueries,
      hideBulkActions,
      http,
      notifications,
      application,
      casesService,
    });

    const refresh = useCallback(() => {
      refreshQueries();
      clearSelection();
    }, [clearSelection, refreshQueries]);

    const columnIds = useMemo(() => columns.map((column) => column.id), [columns]);

    const toolbarVisibility = useGetToolbarVisibility({
      bulkActions,
      alertsCount,
      rowSelection: bulkActionsState.rowSelection,
      alerts,
      isLoading,
      columnIds,
      onToggleColumn,
      onResetColumns,
      browserFields,
      additionalToolbarControls,
      setIsBulkActionsLoading,
      clearSelection,
      refresh,
      fieldsBrowserOptions,
      alertsQuerySnapshot,
      showInspectButton,
      toolbarVisibilityProp,
      settings,
    });

    const leadingControlColumns: EuiDataGridControlColumn[] | undefined = useMemo(() => {
      const controlColumns = [
        ...(additionalLeadingControlColumns ?? []),
        ...(isBulkActionsColumnActive
          ? [
              {
                id: 'bulkActions',
                width: 30,
                headerCellRender: BulkActionsHeader,
                rowCellRender: BulkActionsCell,
              },
            ]
          : []),
        // If the user provided an actions cell renderer, add the actions column
        ...(renderActionsCell
          ? [
              {
                id: 'expandColumn',
                width: actionsColumnWidth,
                headerCellRender: ControlColumnHeaderCell,
                // Though untyped, rowCellRender's CellPropsWithContext contains the correct context
                rowCellRender:
                  ActionsCellHost as unknown as EuiDataGridControlColumn['rowCellRender'],
              },
            ]
          : []),
      ];
      if (controlColumns.length) {
        return controlColumns;
      }
    }, [
      additionalLeadingControlColumns,
      isBulkActionsColumnActive,
      renderActionsCell,
      actionsColumnWidth,
    ]);

    const flyoutRowIndex = flyoutAlertIndex + pageIndex * pageSize;

    // Row classes do not deal with visible row indices, so we need to handle page offset
    const activeRowClasses = useMemo<NonNullable<EuiDataGridStyle['rowClasses']>>(
      () => ({
        [flyoutRowIndex]: 'alertsTableActiveRow',
      }),
      [flyoutRowIndex]
    );

    const handleFlyoutClose = useCallback(() => setFlyoutAlertIndex(-1), [setFlyoutAlertIndex]);

    const dataGridPagination = useMemo(
      () => ({
        pageIndex,
        pageSize,
        pageSizeOptions,
        onChangeItemsPerPage: onChangePageSize,
        onChangePage: onChangePageIndex,
      }),
      [onChangePageIndex, onChangePageSize, pageIndex, pageSize, pageSizeOptions]
    );

    const { getCellActionsForColumn, visibleCellActions, disabledCellActions } =
      cellActionsOptions ?? defaultCellActionsOptions;

    const columnsWithCellActions = useMemo(() => {
      if (getCellActionsForColumn) {
        return columns.map((col, idx) => ({
          ...col,
          ...(!(disabledCellActions ?? []).includes(col.id)
            ? {
                cellActions: getCellActionsForColumn(col.id, idx) ?? [],
                visibleCellActions,
              }
            : {}),
        }));
      }
      return columns;
    }, [getCellActionsForColumn, columns, disabledCellActions, visibleCellActions]);

    // Update highlighted rows when alerts or pagination changes
    const highlightedRowClasses = useMemo(() => {
      if (shouldHighlightRow) {
        const emptyShouldHighlightRow: EuiDataGridStyle['rowClasses'] = {};
        return alerts.reduce<NonNullable<EuiDataGridStyle['rowClasses']>>(
          (rowClasses, alert, index) => {
            if (shouldHighlightRow(alert)) {
              rowClasses[index + pageIndex * pageSize] = 'alertsTableHighlightedRow';
            }

            return rowClasses;
          },
          emptyShouldHighlightRow
        );
      } else {
        return stableMappedRowClasses;
      }
    }, [shouldHighlightRow, alerts, pageIndex, pageSize]);

    const mergedGridStyle = useMemo(() => {
      const propGridStyle: NonNullable<EuiDataGridStyle> = props.gridStyle ?? {};
      // Merges default row classes, custom ones and adds the active row class style
      return {
        ...defaultGridStyle,
        ...propGridStyle,
        rowClasses: {
          // We're spreading the highlighted row classes first, so that the active
          // row classed can override the highlighted row classes.
          ...highlightedRowClasses,
          ...activeRowClasses,
        },
      };
    }, [activeRowClasses, highlightedRowClasses, props.gridStyle]);

    // Merges the default grid style with the grid style that comes in through props.
    const actualGridStyle = useMemo(() => {
      const propGridStyle: NonNullable<EuiDataGridStyle> = props.gridStyle ?? {};
      // If ANY additional rowClasses have been provided, we need to merge them with our internal ones
      if (propGridStyle.rowClasses) {
        // Get all row indices with a rowClass.
        const mergedKeys = [
          ...Object.keys(mergedGridStyle.rowClasses || {}),
          ...Object.keys(propGridStyle.rowClasses || {}),
        ];
        // Deduplicate keys to avoid extra iterations
        const dedupedKeys = Array.from(new Set(mergedKeys));

        // For each index, merge row classes
        mergedGridStyle.rowClasses = dedupedKeys.reduce<
          NonNullable<EuiDataGridStyle['rowClasses']>
        >((rowClasses, key) => {
          const intKey = parseInt(key, 10);
          // Use internal row classes over custom row classes.
          rowClasses[intKey] =
            mergedGridStyle.rowClasses?.[intKey] || propGridStyle.rowClasses?.[intKey] || '';
          return rowClasses;
        }, {});
      }
      return mergedGridStyle;
    }, [props.gridStyle, mergedGridStyle]);

    const renderCustomGridBody = useCallback<NonNullable<EuiDataGridProps['renderCustomGridBody']>>(
      ({ visibleColumns: _visibleColumns, Cell, headerRow, footerRow }) => (
        <>
          {headerRow}
          <NonVirtualizedGridBody
            alerts={alerts}
            visibleColumns={_visibleColumns}
            Cell={Cell}
            actualGridStyle={actualGridStyle}
            pageIndex={pageIndex}
            pageSize={pageSize}
            isLoading={isLoadingAlerts}
            stripes={props.gridStyle?.stripes}
          />
          {footerRow}
        </>
      ),
      [alerts, actualGridStyle, pageIndex, pageSize, isLoadingAlerts, props.gridStyle?.stripes]
    );

    const sortProps = useMemo(() => {
      return { columns: sortingColumns, onSort };
    }, [sortingColumns, onSort]);

    const columnVisibility = useMemo(() => {
      return { visibleColumns, setVisibleColumns: onChangeVisibleColumns };
    }, [visibleColumns, onChangeVisibleColumns]);

    const rowStyles = useMemo(
      () => css`
        .alertsTableHighlightedRow {
          background-color: ${euiThemeVars.euiColorHighlight};
        }

        .alertsTableActiveRow {
          background-color: ${colorMode === 'LIGHT'
            ? tint(euiThemeVars.euiColorLightShade, 0.5)
            : euiThemeVars.euiColorLightShade};
        }
      `,
      [colorMode]
    );

    return (
      <InspectButtonContainer>
        <section style={{ width: '100%' }} data-test-subj={props['data-test-subj']}>
          <Suspense fallback={null}>
            {flyoutAlertIndex > -1 && (
              <AlertsFlyout<AC>
                {...renderContext}
                alert={alerts[flyoutAlertIndex]}
                alertsCount={alertsCount}
                onClose={handleFlyoutClose}
                flyoutIndex={flyoutAlertIndex + pageIndex * pageSize}
                onPaginate={onPaginateFlyout}
              />
            )}
          </Suspense>
          {alertsCount > 0 && (
            <EuiDataGrid
              {...euiDataGridProps}
              // As per EUI docs, it is not recommended to switch between undefined and defined height.
              // If user changes height, it is better to unmount and mount the component.
              // Ref: https://eui.elastic.co/#/tabular-content/data-grid#virtualization
              key={height ? 'fixedHeight' : 'autoHeight'}
              ref={dataGridRef}
              css={rowStyles}
              aria-label="Alerts table"
              data-test-subj="alertsTable"
              height={height}
              columns={columnsWithCellActions}
              columnVisibility={columnVisibility}
              trailingControlColumns={trailingControlColumns}
              leadingControlColumns={leadingControlColumns}
              rowCount={alertsCount}
              renderCustomGridBody={dynamicRowHeight ? renderCustomGridBody : undefined}
              cellContext={renderContext}
              // Cast necessary because `cellContext` is untyped in EuiDataGrid
              renderCellValue={CellValueHost as RenderCellValue}
              renderCellPopover={CellPopoverHost}
              gridStyle={actualGridStyle}
              sorting={sortProps}
              toolbarVisibility={toolbarVisibility}
              pagination={dataGridPagination}
              rowHeightsOptions={rowHeightsOptions}
              onColumnResize={onColumnResize}
            />
          )}
        </section>
      </InspectButtonContainer>
    );
  }
);

(AlertsDataGrid as FC).displayName = 'AlertsDataGrid';
