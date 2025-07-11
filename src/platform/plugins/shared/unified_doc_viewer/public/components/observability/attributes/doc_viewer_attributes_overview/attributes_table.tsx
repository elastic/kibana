/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiDataGrid, EuiDataGridProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useMemo } from 'react';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { FieldRow } from '../../../doc_viewer_table/field_row';
import { TableCell } from '../../../doc_viewer_table/table_cell';
import {
  getFieldCellActions,
  getFieldValueCellActions,
} from '../../../doc_viewer_table/table_cell_actions';
import { AttributeField } from './attributes_overview';

interface AttributesTableProps
  extends Pick<
    DocViewRenderProps,
    'hit' | 'dataView' | 'columnsMeta' | 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'columns'
  > {
  fields: AttributeField[];
  searchTerm: string;
  isEsqlMode: boolean;
}

const GRID_PROPS: Pick<EuiDataGridProps, 'columnVisibility' | 'rowHeightsOptions' | 'gridStyle'> = {
  columnVisibility: {
    visibleColumns: ['name', 'value'],
    setVisibleColumns: () => null,
  },
  rowHeightsOptions: { defaultHeight: 'auto' },
  gridStyle: {
    border: 'horizontal',
    stripes: true,
    rowHover: 'highlight',
    header: 'underline',
    cellPadding: 'm',
    fontSize: 's',
  },
};

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
  isEsqlMode,
}: AttributesTableProps) => {
  const flattened = useMemo(() => hit.flattened, [hit.flattened]);
  const { fieldFormats, toasts } = getUnifiedDocViewerServices();

  const onToggleColumn = useCallback(() => {
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
            columnsMeta,
          })
      ),
    [fields, flattened, hit, dataView, fieldFormats, columnsMeta]
  );

  const fieldCellActions = useMemo(
    () => getFieldCellActions({ rows, isEsqlMode, onFilter: filter, onToggleColumn }),
    [rows, filter, onToggleColumn, isEsqlMode]
  );
  const fieldValueCellActions = useMemo(
    () => getFieldValueCellActions({ rows, isEsqlMode, toasts, onFilter: filter }),
    [rows, toasts, filter, isEsqlMode]
  );

  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
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
    ],
    [fieldCellActions, fieldValueCellActions]
  );

  const renderCellValue: EuiDataGridProps['renderCellValue'] = useCallback(
    ({ rowIndex, columnId }) => {
      return (
        <TableCell
          searchTerm={searchTerm}
          rows={rows}
          rowIndex={rowIndex}
          columnId={columnId}
          isDetails={false}
        />
      );
    },
    [rows, searchTerm]
  );

  return (
    <div>
      <EuiDataGrid
        aria-label={i18n.translate('unifiedDocViewer.docView.attributes.table.ariaLabel', {
          defaultMessage: 'Attributes table',
        })}
        columns={gridColumns}
        rowCount={rows.length}
        renderCellValue={renderCellValue}
        {...GRID_PROPS}
        inMemory={{ level: 'enhancements' }}
        toolbarVisibility={false}
      />
    </div>
  );
};
