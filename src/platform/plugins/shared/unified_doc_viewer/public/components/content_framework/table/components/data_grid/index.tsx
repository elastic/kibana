/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiDataGrid,
  EuiDataGridProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useEuiTheme,
} from '@elastic/eui';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FieldRow } from '../../../../doc_viewer_table/field_row';
import {
  getFieldCellActions,
  getFieldValueCellActions,
} from '../../../../doc_viewer_table/table_cell_actions';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

export interface DataGridField {
  name: string;
  value: unknown;
  formattedValue: unknown;
  content?: React.ReactNode;
  metadata?: {
    description: string;
    fieldName: string;
  };
}

interface DataGridProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fields: Record<string, DataGridField>;
  isEsqlMode: boolean;
  title: string;
}

export const DataGrid = ({
  hit,
  dataView,
  columnsMeta,
  fields,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
  isEsqlMode,
  title,
}: DataGridProps) => {
  const { fieldFormats, toasts } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }
    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [onRemoveColumn, onAddColumn, columns]);

  const rows: FieldRow[] = useMemo(
    () =>
      Object.entries(fields).map(([key, field]) => {
        return new FieldRow({
          name: key,
          displayNameOverride: key,
          flattenedValue: field.value,
          hit,
          dataView,
          fieldFormats,
          isPinned: false,
          columnsMeta,
        });
      }),
    [fields, hit, dataView, fieldFormats, columnsMeta]
  );

  const fieldCellActions = useMemo(
    () => getFieldCellActions({ rows, isEsqlMode, onFilter: filter, onToggleColumn }),
    [rows, filter, onToggleColumn, isEsqlMode]
  );
  const fieldValueCellActions = useMemo(
    () => getFieldValueCellActions({ rows, isEsqlMode, toasts, onFilter: filter }),
    [rows, toasts, filter, isEsqlMode]
  );

  const gridColumns: EuiDataGridProps['columns'] = [
    {
      id: 'name',
      actions: false,
      cellActions: fieldCellActions,
    },
    {
      id: 'value',
      actions: false,
      cellActions: fieldValueCellActions,
    },
  ];

  const renderCellValue = ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
    const row = rows[rowIndex];
    const fieldConfig = fields[row.name];
    const fieldMetadata = fieldConfig.metadata;

    if (!row) return null;
    if (columnId === 'name') {
      return (
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem
            grow={false}
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {fieldConfig.name}
          </EuiFlexItem>

          {fieldMetadata && (
            <EuiFlexItem grow={false}>
              <EuiIconTip
                title={fieldMetadata.fieldName}
                content={fieldMetadata.description}
                size="s"
                color="subdued"
                aria-label={`${fieldMetadata.fieldName}: ${fieldMetadata.description}`}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    }
    if (columnId === 'value') return fieldConfig.content;
    return null;
  };

  return (
    <EuiDataGrid
      css={css`
        .euiDataGridHeader {
          height: 20px;
        }
        .euiDataGridHeaderCell {
          display: none;
        }
      `}
      aria-label={title}
      columns={gridColumns}
      rowCount={rows.length}
      renderCellValue={renderCellValue}
      columnVisibility={{
        visibleColumns: ['name', 'value'],
        setVisibleColumns: () => null,
      }}
      gridStyle={{
        border: 'horizontal',
        rowHover: 'none',
        cellPadding: 'm',
        fontSize: 's',
      }}
      rowHeightsOptions={{ defaultHeight: 'auto' }}
      inMemory={{ level: 'enhancements' }}
      toolbarVisibility={false}
    />
  );
};
