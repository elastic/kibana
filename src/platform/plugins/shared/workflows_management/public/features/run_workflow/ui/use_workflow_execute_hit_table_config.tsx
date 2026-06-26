/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { EuiText, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { buildDataTableRecordList } from '@kbn/discover-utils';
import { FormattedMessage, FormattedNumber } from '@kbn/i18n-react';
import type {
  DataTableColumnsMeta,
  UnifiedDataTableRenderCustomToolbar,
  UnifiedDataTableRenderCustomToolbarProps,
} from '@kbn/unified-data-table';
import { getRenderCustomToolbarWithElements } from '@kbn/unified-data-table';
import type {
  UseWorkflowExecuteHitTableConfigOptions,
  UseWorkflowExecuteHitTableConfigResult,
} from './use_workflow_execute_hit_table_config_types';
import { WorkflowExecuteDataGridCellPopover } from './workflow_execute_data_grid_cell_popover';
import { WorkflowExecuteHitSelectionSync } from './workflow_execute_hit_selection_sync';
import {
  buildUnifiedDataTableServices,
  getNoUnifiedDataTableCellActions,
  useUnifiedDataTableColumnState,
  useUnifiedDataTableTimestampTypography,
} from './workflow_execute_unified_table_base';

export type {
  UseWorkflowExecuteHitTableConfigOptions,
  UseWorkflowExecuteHitTableConfigResult,
} from './use_workflow_execute_hit_table_config_types';

const buildColumnsMetaFromFieldNames = (fieldNames: readonly string[]): DataTableColumnsMeta =>
  fieldNames.reduce<DataTableColumnsMeta>((meta, fieldName) => {
    meta[fieldName] = { type: 'string' };
    return meta;
  }, {});

export function useWorkflowExecuteHitTableConfig(
  options: UseWorkflowExecuteHitTableConfigOptions
): UseWorkflowExecuteHitTableConfigResult {
  const {
    services,
    dataView,
    hits,
    defaultColumns,
    externalCustomRenderers,
    customGridColumnsConfiguration,
    ensureColumnWhenOnlyTimeField,
    onSelectionChange,
    setErrors,
    tableSort,
    onTableSortChange,
  } = options;

  const { euiTheme } = useEuiTheme();
  const timestampCellTypography = useUnifiedDataTableTimestampTypography();

  const defaultColumnsList = useMemo(() => [...defaultColumns], [defaultColumns]);

  const dataTableRows = useMemo(
    () =>
      buildDataTableRecordList({
        records: hits,
        dataView: dataView ?? undefined,
        processRecord: ensureColumnWhenOnlyTimeField
          ? (record) => ({
              ...record,
              flattened: {
                ...record.flattened,
                [ensureColumnWhenOnlyTimeField]: record.id,
              },
            })
          : undefined,
      }),
    [dataView, ensureColumnWhenOnlyTimeField, hits]
  );

  const {
    visibleTableColumns,
    showTimeColumn,
    sort,
    handleSortChange,
    handleUnifiedDataTableSetColumns,
  } = useUnifiedDataTableColumnState({
    defaultColumns: defaultColumnsList,
    dataView,
    fallbackColumns: defaultColumnsList,
    ensureColumnWhenOnlyTimeField,
    tableSort,
    onTableSortChange,
  });

  const columnsMeta = useMemo(
    () => buildColumnsMetaFromFieldNames(defaultColumnsList),
    [defaultColumnsList]
  );

  const unifiedDataTableServices = useMemo(
    () => buildUnifiedDataTableServices(services),
    [services]
  );

  const documentCount = hits.length;

  const leftToolbarContent = useMemo(
    () => (
      <EuiText size="s" color="subdued">
        <span css={{ fontWeight: euiTheme.font.weight.bold }}>
          <FormattedNumber value={documentCount} />
        </span>{' '}
        <FormattedMessage
          id="workflows.workflowExecuteIndexForm.documentCountLabel"
          defaultMessage="{count, plural, one {document} other {documents}}"
          values={{ count: documentCount }}
        />
      </EuiText>
    ),
    [documentCount, euiTheme.font.weight.bold]
  );

  const baseToolbarRenderer = useMemo(
    () => getRenderCustomToolbarWithElements({ leftSide: leftToolbarContent }),
    [leftToolbarContent]
  );

  const renderCustomToolbar = useMemo((): UnifiedDataTableRenderCustomToolbar => {
    function renderHitToolbar(toolbarProps: UnifiedDataTableRenderCustomToolbarProps) {
      return (
        <>
          <WorkflowExecuteHitSelectionSync
            dataTableRows={dataTableRows}
            onSelectionChange={onSelectionChange}
            setErrors={setErrors}
          />
          {baseToolbarRenderer(toolbarProps)}
        </>
      );
    }
    renderHitToolbar.displayName = 'WorkflowExecuteHitRenderCustomToolbar';
    return renderHitToolbar;
  }, [baseToolbarRenderer, dataTableRows, onSelectionChange, setErrors]);

  const renderCellPopover = useCallback((popoverProps: EuiDataGridCellPopoverElementProps) => {
    return <WorkflowExecuteDataGridCellPopover {...popoverProps} />;
  }, []);

  return {
    visibleTableColumns,
    showTimeColumn,
    sort,
    dataTableRows,
    columnsMeta,
    externalCustomRenderers: externalCustomRenderers ?? {},
    customGridColumnsConfiguration,
    unifiedDataTableServices,
    getNoCellActions: getNoUnifiedDataTableCellActions,
    handleSortChange,
    handleUnifiedDataTableSetColumns,
    timestampCellTypography,
    renderCustomToolbar,
    renderCellPopover,
  };
}
