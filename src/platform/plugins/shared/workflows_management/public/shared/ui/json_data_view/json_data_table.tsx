/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridColumnCellAction, EuiDataGridRefProps } from '@elastic/eui';
import {
  EuiDataGrid,
  type UseEuiTheme,
  type EuiDataGridProps,
  useResizeObserver,
  EuiEmptyPrompt,
  copyToClipboard,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePager } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { TableFieldValue } from './table_field_value';
import { kibanaFlatten } from '../../lib/kibana_flatten';
import { FieldName } from './field_name';
import { inferFieldType } from './infer_field_type';
import { formatValue } from './format_value';
import { useGetFormattedDateTime } from '../use_formatted_date';

const MIN_NAME_COLUMN_WIDTH = 120;
const MAX_NAME_COLUMN_WIDTH = 300;

export interface JSONDataTableProps {
  /** The JSON data object to display as a table */
  data: Record<string, unknown>;
  /** Optional title for the data view. Defaults to 'JSON Data' */
  title?: string;
  /** Optional search term to filter the data */
  searchTerm?: string;
  /** Optional prefix for the field path actions, such as the copy the field path to the clipboard. */
  fieldPathActionsPrefix?: string;
}

interface JSONDataTableRecord extends DataTableRecord {
  flattened: {
    field: string;
    value: string;
    fieldType: string;
  };
}

/**
 * JSONDataTable component that displays arbitrary JSON data using Kibana's unified data table.
 */
export const JSONDataTable = React.memo<JSONDataTableProps>(
  ({ data: jsonObject, title = 'JSON Data', searchTerm, fieldPathActionsPrefix }) => {
    const styles = useMemoCss(componentStyles);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dataGridRef = useRef<EuiDataGridRefProps | null>(null);
    const getFormattedDateTime = useGetFormattedDateTime();

    // Create DataTableRecord from JSON - each field becomes a row
    const dataTableRecords = useMemo((): JSONDataTableRecord[] => {
      // Flatten nested objects for better display
      const flattened = kibanaFlatten(jsonObject);

      // Create a row for each field-value pair
      return Object.keys(flattened).map((fieldName, index) => {
        const value = flattened[fieldName];
        const fieldType = inferFieldType(value);
        const displayValue =
          fieldType === 'date'
            ? getFormattedDateTime(new Date(value as string)) ?? ''
            : formatValue(value);

        return {
          id: `field-${index}`,
          raw: {
            _id: `field-${index}`,
            _index: title.toLowerCase().replace(/\s+/g, '_'),
            _source: { field: fieldName, value: displayValue, fieldType },
          },
          flattened: {
            field: fieldName,
            value: displayValue,
            fieldType, // Store the field type for the cell renderer
          },
        };
      });
    }, [jsonObject, getFormattedDateTime, title]);

    const filteredDataTableRecords = useMemo(() => {
      if (!searchTerm) {
        return dataTableRecords;
      }
      return dataTableRecords.filter((record) => {
        return (
          record.flattened.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.flattened.value.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }, [dataTableRecords, searchTerm]);

    const { width: containerWidth } = useResizeObserver(containerRef.current);
    const { curPageIndex, pageSize, changePageIndex, changePageSize } = usePager({
      initialPageSize: 20,
      totalItems: filteredDataTableRecords.length,
    });

    const fieldCellActions: EuiDataGridColumnCellAction[] = useMemo(() => {
      const cellActions = [];
      const closePopover = () => dataGridRef.current?.closeCellPopover();
      if (fieldPathActionsPrefix != null) {
        cellActions.push(
          getCopyCellActionComponent(filteredDataTableRecords, fieldPathActionsPrefix, closePopover)
        );
      }
      return cellActions;
    }, [filteredDataTableRecords, fieldPathActionsPrefix]);

    // Grid columns configuration
    const gridColumns: EuiDataGridProps['columns'] = useMemo(
      () => [
        {
          id: 'name',
          displayAsText: 'Field',
          initialWidth: Math.min(
            Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
            MAX_NAME_COLUMN_WIDTH
          ),
          actions: false,
          cellActions: fieldCellActions,
        },
        {
          id: 'value',
          displayAsText: 'Value',
          actions: false,
        },
      ],
      [containerWidth, fieldCellActions]
    );

    // Cell renderer for the data grid
    const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(() => {
      return ({ rowIndex, columnId }) => {
        const row = filteredDataTableRecords[rowIndex];
        if (!row) return null;

        if (columnId === 'name') {
          const fieldName = row.flattened.field as string;
          const fieldType = row.flattened.fieldType as string;

          return <FieldName fieldName={fieldName} fieldType={fieldType} highlight={searchTerm} />;
        }

        if (columnId === 'value') {
          return (
            <TableFieldValue
              formattedValue={row.flattened.value as string}
              field={row.flattened.field as string}
              rawValue={row.flattened.value}
              isHighlighted={Boolean(
                searchTerm && row.flattened.value.toLowerCase().includes(searchTerm.toLowerCase())
              )}
            />
          );
        }

        return null;
      };
    }, [filteredDataTableRecords, searchTerm]);

    const staticDataGridSettings: Pick<
      EuiDataGridProps,
      'columnVisibility' | 'sorting' | 'gridStyle' | 'rowHeightsOptions'
    > = useMemo(
      () => ({
        columnVisibility: { visibleColumns: ['name', 'value'], setVisibleColumns: () => {} },
        sorting: { columns: [], onSort: () => {} },
        gridStyle: {
          header: 'underline',
          border: 'horizontal',
          fontSize: 's',
          stripes: true,
          cellPadding: 'm',
        },
        rowHeightsOptions: { defaultHeight: 'auto' },
      }),
      []
    );

    const pagination: EuiDataGridProps['pagination'] = useMemo(
      () => ({
        pageSizeOptions: [20, 50, 100, 200],
        pageIndex: curPageIndex,
        pageSize,
        onChangeItemsPerPage: changePageSize,
        onChangePage: changePageIndex,
      }),
      [curPageIndex, pageSize, changePageSize, changePageIndex]
    );

    if (filteredDataTableRecords.length === 0) {
      return (
        <EuiEmptyPrompt
          title={
            <h2>
              <FormattedMessage
                id="workflows.jsonDataTable.noData"
                defaultMessage="No data to display"
              />
            </h2>
          }
          iconType="empty"
        />
      );
    }

    return (
      <EuiDataGrid
        ref={dataGridRef}
        css={styles.fieldsGrid}
        aria-label={title}
        columns={gridColumns}
        rowCount={filteredDataTableRecords.length}
        renderCellValue={renderCellValue}
        toolbarVisibility={false}
        pagination={pagination}
        {...staticDataGridSettings}
      />
    );
  }
);
const componentStyles = {
  fieldsGrid: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    return css({
      '&.euiDataGrid--noControls.euiDataGrid--bordersHorizontal .euiDataGridHeader': {
        borderTop: 'none',
      },
      '&.euiDataGrid--headerUnderline .euiDataGridHeader': {
        borderBottom: euiTheme.border.thin,
      },
    });
  },
};

// Cell action component creator, to copy the field path to the clipboard
const CopyFieldPathText = i18n.translate('workflows.jsonDataTable.copyFieldPath', {
  defaultMessage: 'Copy field path',
});
const getCopyCellActionComponent = (
  records: JSONDataTableRecord[],
  fieldPathPrefix: string,
  closePopover: () => void
): EuiDataGridColumnCellAction =>
  React.memo(({ rowIndex, Component }) => {
    const row = records[rowIndex];
    const copy = useCallback(() => {
      copyToClipboard(`${fieldPathPrefix}.${row.flattened.field}`);
      closePopover();
    }, [row.flattened.field]);

    return (
      <Component onClick={copy} iconType="copyClipboard" aria-label={CopyFieldPathText}>
        {CopyFieldPathText}
      </Component>
    );
  });
