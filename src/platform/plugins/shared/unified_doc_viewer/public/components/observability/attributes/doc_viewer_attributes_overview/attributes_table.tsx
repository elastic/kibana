/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiDataGrid, EuiDataGridProps } from '@elastic/eui';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { i18n } from '@kbn/i18n';
import { TableCell } from '../../../doc_viewer_table/table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
} from '../../../doc_viewer_table/table_cell_actions';
import { FieldRow } from '../../../doc_viewer_table/field_row';
import { getUnifiedDocViewerServices } from '../../../../plugin';

interface AttributesTableProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fields: string[];
  searchTerm: string;
}

export const AttributesTable = ({
  hit,
  dataView,
  columnsMeta,
  fields,
  searchTerm,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
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

  const displayedFields = useMemo(
    () => fields.filter((field) => field.toLowerCase().includes(searchTerm.toLowerCase())),
    [fields, searchTerm]
  );

  const rows: FieldRow[] = useMemo(
    () =>
      displayedFields.map(
        (field) =>
          new FieldRow({
            name: field,
            flattenedValue: flattened[field],
            hit,
            dataView,
            fieldFormats,
            isPinned: false,
            columnsMeta,
          })
      ),
    [displayedFields, flattened, hit, dataView, fieldFormats, columnsMeta]
  );

  const fieldCellActions = useMemo(
    () => getFieldCellActions({ rows, isEsqlMode: false, onFilter: filter, onToggleColumn }),
    [rows, filter, onToggleColumn]
  );
  const fieldValueCellActions = useMemo(
    () => getFieldValueCellActions({ rows, isEsqlMode: false, toasts, onFilter: filter }),
    [rows, toasts, filter]
  );

  const gridColumns: EuiDataGridProps['columns'] = [
    {
      id: 'name',
      displayAsText: i18n.translate('unifiedDocViewer.docView.attributes.table.nameColumn', {
        defaultMessage: 'Field',
      }),
      actions: false,
      visibleCellActions: 3,
      cellActions: fieldCellActions,
    },
    {
      id: 'value',
      displayAsText: i18n.translate('unifiedDocViewer.docView.attributes.table.valueColumn', {
        defaultMessage: 'Value',
      }),
      actions: false,
      visibleCellActions: 3,
      cellActions: fieldValueCellActions,
    },
  ];

  return (
    <EuiDataGrid
      aria-label={i18n.translate('unifiedDocViewer.docView.attributes.table.ariaLabel', {
        defaultMessage: 'Attributes table',
      })}
      columns={gridColumns}
      rowCount={rows.length}
      renderCellValue={({ rowIndex, columnId }) => (
        <TableCell
          searchTerm={searchTerm}
          rows={rows}
          rowIndex={rowIndex}
          columnId={columnId}
          isDetails={false}
        />
      )}
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
      rowHeightsOptions={{ defaultHeight: 'auto' }}
      inMemory={{ level: 'enhancements' }}
      toolbarVisibility={false}
    />
  );
};
