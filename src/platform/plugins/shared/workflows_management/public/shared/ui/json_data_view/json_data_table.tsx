/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef } from 'react';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import {
  EuiDataGrid,
  type UseEuiTheme,
  euiFontSize,
  type EuiDataGridProps,
  useResizeObserver,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePager } from '@kbn/discover-utils';
import { TableFieldValue } from './table_field_value';
import { kibanaFlatten } from '../../lib/kibana_flatten';
import { FieldName } from './field_name';
import { inferFieldType } from './infer_field_type';
import { formatValue } from './format_value';
import { useGetFormattedDateTime } from '../use_formatted_date';

const MIN_NAME_COLUMN_WIDTH = 120;
const MAX_NAME_COLUMN_WIDTH = 300;

/**
 * Props for the JSONDataTable component
 */
export interface JSONDataTableProps {
  /**
   * The JSON data to display. Can be a single object, an array of objects, or any serializable value.
   * If an array is provided, only the first object will be displayed.
   * If a primitive value is provided, it will be wrapped in an object.
   */
  data: Record<string, unknown>;

  /**
   * Optional title for the data view. Defaults to 'JSON Data'
   */
  title?: string;

  /**
   * Optional columns to display. If not provided, all keys from the data will be used.
   */
  columns?: string[];

  /**
   * Optional custom column metadata for type information and formatting
   */
  columnsMeta?: DataTableColumnsMeta;

  /**
   * Whether to hide the actions column in the doc viewer. Defaults to true.
   */
  hideActionsColumn?: boolean;

  /**
   * Additional CSS class name for styling
   */
  className?: string;

  /**
   * Optional search term to filter the data
   */
  searchTerm?: string;

  /**
   * Test subject for testing purposes
   */
  'data-test-subj'?: string;
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
 *
 * This component converts JSON objects into a format compatible with UnifiedDataTable,
 * providing a rich tabular view with support for nested objects, arrays, and various data types.
 *
 * @example
 * ```tsx
 * const jsonData = {
 *   id: '123',
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   metadata: { role: 'admin', lastLogin: '2024-01-15T10:30:00Z' }
 * };
 *
 * <JSONDataTable
 *   data={jsonData}
 *   title="User Data"
 *   columns={['id', 'name', 'email']}
 * />
 * ```
 */
export function JSONDataTable({
  data: jsonObject,
  title = 'JSON Data',
  columns,
  searchTerm,
  'data-test-subj': dataTestSubj = 'jsonDataTable',
}: JSONDataTableProps) {
  const styles = useMemoCss(componentStyles);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const getFormattedDateTime = useGetFormattedDateTime();

  // Create DataTableRecord from JSON - each field becomes a row
  const dataTableRecords = useMemo((): JSONDataTableRecord[] => {
    // Flatten nested objects for better display

    const flattened = kibanaFlatten(jsonObject);

    // Filter fields if columns prop is provided
    const fieldsToShow = columns
      ? Object.keys(flattened).filter((key) => columns.includes(key))
      : Object.keys(flattened);

    // Create a row for each field-value pair
    return fieldsToShow.map((fieldName, index) => {
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
  }, [jsonObject, columns, getFormattedDateTime, title]);

  const filteredDataTableRecords = useMemo(() => {
    return dataTableRecords.filter((record) => {
      return (
        record.flattened.field.toLowerCase().includes(searchTerm?.toLowerCase() || '') ||
        record.flattened.value.toLowerCase().includes(searchTerm?.toLowerCase() || '')
      );
    });
  }, [dataTableRecords, searchTerm]);

  const { width: containerWidth } = useResizeObserver(containerRef.current);
  const { curPageIndex, pageSize, changePageIndex, changePageSize } = usePager({
    initialPageSize: 20,
    totalItems: filteredDataTableRecords.length,
  });

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
      },
      {
        id: 'value',
        displayAsText: 'Value',
        actions: false,
      },
    ],
    [containerWidth]
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
      className="kbnDocViewer__fieldsGrid"
      css={styles.fieldsGrid}
      aria-label={title || 'JSON Data Table'}
      columns={gridColumns}
      columnVisibility={{
        visibleColumns: ['name', 'value'],
        setVisibleColumns: () => {},
      }}
      rowCount={filteredDataTableRecords.length}
      renderCellValue={renderCellValue}
      toolbarVisibility={false}
      sorting={{ columns: [], onSort: () => {} }}
      rowHeightsOptions={{ defaultHeight: 'auto' }}
      gridStyle={{
        header: 'underline',
        border: 'horizontal',
        fontSize: 's',
        stripes: true,
      }}
      pagination={{
        pageSizeOptions: [20, 50, 100, 200],
        pageIndex: curPageIndex,
        pageSize,
        onChangeItemsPerPage: changePageSize,
        onChangePage: changePageIndex,
      }}
    />
  );
}

const componentStyles = {
  fieldsGrid: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');

    // taken from src/platform/plugins/shared/unified_doc_viewer/public/components/doc_viewer_table/table.tsx
    return css({
      '&.euiDataGrid--noControls.euiDataGrid--bordersHorizontal .euiDataGridHeader': {
        borderTop: 'none',
      },

      '&.euiDataGrid--headerUnderline .euiDataGridHeader': {
        borderBottom: euiTheme.border.thin,
      },

      '& [data-gridcell-column-id="name"] .euiDataGridRowCell__content': {
        paddingTop: 0,
        paddingBottom: 0,
      },

      '.kbnDocViewer__fieldName': {
        padding: euiTheme.size.xs,
        paddingLeft: 0,
        lineHeight: euiTheme.font.lineHeightMultiplier,

        '.euiDataGridRowCell__popover &': {
          fontSize,
        },
      },

      '.kbnDocViewer__fieldName_icon': {
        paddingTop: `calc(${euiTheme.size.xs} * 1.5)`,
        lineHeight: euiTheme.font.lineHeightMultiplier,
      },
    });
  },
};
