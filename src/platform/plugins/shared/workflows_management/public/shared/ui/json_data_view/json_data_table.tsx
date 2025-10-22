/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridColumnCellAction,
  EuiDataGridProps,
  EuiDataGridRefProps,
  UseEuiTheme,
} from '@elastic/eui';
import { copyToClipboard, EuiDataGrid, EuiEmptyPrompt, useResizeObserver } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useRef } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { usePager } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { JsonArray, JsonObject } from '@kbn/utility-types';
import { FieldName } from './field_name';
import { formatValue } from './format_value';
import { inferFieldType } from './infer_field_type';
import { TableFieldValue } from './table_field_value';
import { appendKeyPath, flattenKeyPaths } from '../../lib/flatten_key_paths';
import { useGetFormattedDateTime } from '../use_formatted_date';

const MIN_NAME_COLUMN_WIDTH = 120;
const MAX_NAME_COLUMN_WIDTH = 300;

interface JSONDataTableRecord {
  field: string;
  value: string | number | boolean | null;
  fieldType: string;
  searchableValue: string;
}

export interface JSONDataTableProps {
  /** The JSON data object to display as a table */
  data: JsonArray | JsonObject;
  /** Optional title for the data view. Defaults to 'JSON Data' */
  title?: string;
  /** Optional search term to filter the data */
  searchTerm?: string;
  /** Optional prefix for the field path actions, such as the copy the field path to the clipboard. */
  fieldPathActionsPrefix?: string;
}
export const JSONDataTable = React.memo<JSONDataTableProps>(
  ({ data: jsonObject, title = 'JSON Data', searchTerm, fieldPathActionsPrefix }) => {
    const styles = useMemoCss(componentStyles);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const dataGridRef = useRef<EuiDataGridRefProps | null>(null);
    const getFormattedDateTime = useGetFormattedDateTime();

    // Create DataTableRecord from JSON - each field becomes a row
    const records = useMemo((): JSONDataTableRecord[] => {
      // Flatten nested objects for better display
      const flattened = flattenKeyPaths(jsonObject);

      // Create a row for each field-value pair
      return Object.keys(flattened).map((fieldPath) => {
        const value = flattened[fieldPath];
        const fieldType = inferFieldType(value);
        const displayValue =
          fieldType === 'date'
            ? getFormattedDateTime(new Date(value as string)) ?? ''
            : formatValue(value);

        return {
          field: fieldPath, // Each field path is unique
          value: displayValue,
          fieldType, // Store the field type for the cell renderer
          searchableValue: `${fieldPath.toLowerCase()} ${displayValue.toLowerCase()}`,
        };
      });
    }, [jsonObject, getFormattedDateTime]);

    const filteredRecords = useMemo(() => {
      if (!searchTerm) {
        return records;
      }
      return records.filter(({ searchableValue }) =>
        searchableValue.includes(searchTerm.toLowerCase())
      );
    }, [records, searchTerm]);

    const { width: containerWidth } = useResizeObserver(containerRef.current);
    const { curPageIndex, pageSize, changePageIndex, changePageSize } = usePager({
      initialPageSize: 20,
      totalItems: filteredRecords.length,
    });

    const fieldCellActions = useMemo(() => {
      const cellActions: EuiDataGridColumnCellAction[] = [];
      const closePopover = () => dataGridRef.current?.closeCellPopover();
      if (fieldPathActionsPrefix != null) {
        cellActions.push(
          getCopyCellActionComponent(filteredRecords, fieldPathActionsPrefix, closePopover)
        );
      }
      return cellActions;
    }, [filteredRecords, fieldPathActionsPrefix]);

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
      return function RenderCellValue({ rowIndex, columnId }) {
        const record = filteredRecords[rowIndex];
        if (!record) return null;
        const { value, field, fieldType } = record;

        if (columnId === 'name') {
          return <FieldName fieldName={field} fieldType={fieldType} highlight={searchTerm} />;
        }

        if (columnId === 'value') {
          return (
            <TableFieldValue
              formattedValue={value?.toString() ?? ''}
              field={field}
              rawValue={value}
              isHighlighted={Boolean(
                searchTerm && value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
              )}
            />
          );
        }

        return null;
      };
    }, [filteredRecords, searchTerm]);

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

    if (filteredRecords.length === 0) {
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
        rowCount={filteredRecords.length}
        renderCellValue={renderCellValue}
        toolbarVisibility={false}
        pagination={pagination}
        {...staticDataGridSettings}
      />
    );
  }
);
JSONDataTable.displayName = 'JSONDataTable';

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
  React.memo(function CopyCellAction({ rowIndex, Component }) {
    const record = records[rowIndex];
    const copy = useCallback(() => {
      copyToClipboard(appendKeyPath(fieldPathPrefix, record.field));
      closePopover();
    }, [record.field]);

    return (
      <Component onClick={copy} iconType="copyClipboard" aria-label={CopyFieldPathText}>
        {CopyFieldPathText}
      </Component>
    );
  });
