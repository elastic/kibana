/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridProps } from '@elastic/eui';
import { EuiDataGrid } from '@elastic/eui';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { FieldRow } from '../../../../doc_viewer_table/field_row';
import {
  getFieldCellActions,
  getFieldValueCellActions,
} from '../../../../doc_viewer_table/table_cell_actions';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

const dataGridColumnVisibility: EuiDataGridProps['columnVisibility'] = {
  visibleColumns: ['name', 'value'],
  setVisibleColumns: () => null,
};

const dataGridStaticProps: Pick<
  EuiDataGridProps,
  'css' | 'gridStyle' | 'rowHeightsOptions' | 'inMemory'
> = {
  css: css`
    .euiDataGridHeader {
      height: 20px;
    }
    .euiDataGridHeaderCell {
      display: none;
    }
  `,
  gridStyle: {
    border: 'horizontal',
    rowHover: 'none',
    cellPadding: 'm',
    fontSize: 's',
  },
  rowHeightsOptions: { defaultHeight: 'auto' },
  inMemory: { level: 'enhancements' },
};

export interface KeyValueDataGridField {
  name: string;
  value: unknown;
  nameCellContent?: React.ReactNode;
  valueCellContent?: React.ReactNode;
}

interface KeyValueDataGridProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fields: Record<string, KeyValueDataGridField>;
  isEsqlMode: boolean;
  title: string;
}

export const KeyValueDataGrid = ({
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
}: KeyValueDataGridProps) => {
  const { fieldFormats, toasts } = getUnifiedDocViewerServices();

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

  const dataGridRenderCellValue = ({
    rowIndex,
    columnId,
  }: {
    rowIndex: number;
    columnId: string;
  }) => {
    const fieldName = rows[rowIndex]?.name;
    const fieldConfig = fields[fieldName];

    if (!fieldConfig) return null;
    if (columnId === 'name') {
      return fieldConfig.nameCellContent;
    }
    return fieldConfig.valueCellContent;
  };

  const dataGridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      { id: 'name', cellActions: fieldCellActions },
      { id: 'value', cellActions: fieldValueCellActions },
    ],
    [fieldCellActions, fieldValueCellActions]
  );

  return (
    <EuiDataGrid
      aria-label={title}
      columns={dataGridColumns}
      rowCount={rows.length}
      renderCellValue={dataGridRenderCellValue}
      columnVisibility={dataGridColumnVisibility}
      {...dataGridStaticProps}
      toolbarVisibility={false}
    />
  );
};
