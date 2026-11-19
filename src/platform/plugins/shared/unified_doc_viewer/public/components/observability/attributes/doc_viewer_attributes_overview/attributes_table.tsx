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
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import type { DataSource } from '@kbn/data-source';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { FieldRow } from '../../../doc_viewer_table/field_row';
import { TableCell } from '../../../doc_viewer_table/table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
} from '../../../doc_viewer_table/table_cell_actions';
import { getEuiCellActions } from '../../../doc_viewer_table/table_grid/eui_data_grid_adapter';
import type { AttributeField } from './attributes_overview';

interface AttributesTableProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  dataSource: DataSource | undefined;
  fields: AttributeField[];
  searchTerm: string;
  isEsqlMode: boolean;
}

export const AttributesTable = ({
  hit,
  dataView,
  dataSource,
  fields,
  searchTerm,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
  isEsqlMode,
}: AttributesTableProps) => {
  const flattened = hit.flattened;
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
      fields.map(
        (field) =>
          new FieldRow({
            name: field.name,
            displayNameOverride: field.displayName,
            flattenedValue: flattened[field.name],
            hit,
            dataView,
            fieldFormats,
            isPinned: false,
            dataSource,
          })
      ),
    [fields, flattened, hit, dataView, fieldFormats, dataSource]
  );

  const fieldCellActionDefinitions = useMemo(
    () => getFieldCellActions({ onFilter: filter, onToggleColumn, columns }),
    [filter, onToggleColumn, columns]
  );
  const fieldValueCellActionDefinitions = useMemo(
    () => getFieldValueCellActions({ toasts, onFilter: filter }),
    [toasts, filter]
  );

  const gridColumns: EuiDataGridProps['columns'] = [
    {
      id: 'name',
      displayAsText: i18n.translate('unifiedDocViewer.docView.attributes.table.nameColumn', {
        defaultMessage: 'Field',
      }),
      actions: false,
      visibleCellActions: 3,
      cellActions: getEuiCellActions({
        definitions: fieldCellActionDefinitions,
        rows,
        getRowId: ({ name }) => name,
        columnId: 'name',
      }),
    },
    {
      id: 'value',
      displayAsText: i18n.translate('unifiedDocViewer.docView.attributes.table.valueColumn', {
        defaultMessage: 'Value',
      }),
      actions: false,
      visibleCellActions: 3,
      cellActions: getEuiCellActions({
        definitions: fieldValueCellActionDefinitions,
        rows,
        getRowId: ({ name }) => name,
        columnId: 'value',
      }),
    },
  ];

  return (
    <EuiDataGrid
      aria-label={i18n.translate('unifiedDocViewer.docView.attributes.table.ariaLabel', {
        defaultMessage: 'Attributes table',
      })}
      columns={gridColumns}
      rowCount={rows.length}
      renderCellValue={({ rowIndex, columnId }) => {
        const row = rows[rowIndex];
        return row ? (
          <TableCell
            searchTerm={searchTerm}
            row={row}
            columnId={columnId}
            isDetails={false}
            isESQLMode={isEsqlMode}
          />
        ) : null;
      }}
      columnVisibility={{
        visibleColumns: ['name', 'value'],
        setVisibleColumns: () => null,
      }}
      gridStyle={{
        border: 'horizontal',
        stripes: true,
        rowHover: 'highlight',
        header: 'underline',
        cellPadding: 'm',
        fontSize: 's',
      }}
      rowHeightsOptions={{ defaultHeight: { lineCount: 1 } }}
      inMemory={{ level: 'enhancements' }}
      toolbarVisibility={false}
    />
  );
};
