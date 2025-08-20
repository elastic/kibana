/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import { EuiDataGrid, type UseEuiTheme, euiFontSize, type EuiDataGridProps } from '@elastic/eui';
import { FieldIcon } from '@kbn/field-utils';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';

/**
 * Infers the field type from a value to determine the field icon
 */
const inferFieldType = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  if (typeof value === 'string') {
    // Check if it looks like a date
    if (!isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}/.test(value)) {
      return 'date';
    }
    return 'keyword';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'long' : 'double';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'keyword';
};

const componentStyles = {
  fieldsGridWrapper: ({ euiTheme }: UseEuiTheme) =>
    css({
      minBlockSize: 0,
      display: 'block',
    }),
  fieldsGrid: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');

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

      '& [data-gridcell-column-id="pin_field"] .euiDataGridRowCell__content': {
        padding: `calc(${euiTheme.size.xs} / 2) 0 0 ${euiTheme.size.xs}`,
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

      '.kbnDocViewer__fieldName_multiFieldBadge': {
        margin: `${euiTheme.size.xs} 0`,
        fontWeight: euiTheme.font.weight.regular,
        fontFamily: euiTheme.font.family,
      },

      '.kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 0,
      },

      '& [data-gridcell-column-id="pin_field"]:focus-within': {
        '.kbnDocViewer__fieldsGrid__pinAction': {
          opacity: 1,
        },
      },

      '.euiDataGridRow:hover .kbnDocViewer__fieldsGrid__pinAction': {
        opacity: 1,
      },
    });
  },
};

/**
 * Props for the JSONDataTable component
 */
export interface JSONDataTableProps {
  /**
   * The JSON data to display. Can be a single object, an array of objects, or any serializable value.
   * If an array is provided, only the first object will be displayed.
   * If a primitive value is provided, it will be wrapped in an object.
   */
  data: Record<string, unknown> | Record<string, unknown>[] | unknown;

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
   * Test subject for testing purposes
   */
  'data-test-subj'?: string;
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
  data,
  title = 'JSON Data',
  columns,
  'data-test-subj': dataTestSubj = 'jsonDataTable',
}: JSONDataTableProps) {
  const styles = useMemoCss(componentStyles);

  // Convert data to object format if needed
  const jsonObject = useMemo(() => {
    if (Array.isArray(data)) {
      return data[0] || {};
    }

    // If data is already an object, use it directly
    if (data && typeof data === 'object' && data !== null) {
      return data as Record<string, unknown>;
    }

    // For primitive values, wrap them in an object
    if (data !== undefined && data !== null) {
      return { value: data };
    }

    return {};
  }, [data]);

  // Create DataTableRecord from JSON - each field becomes a row
  const dataTableRecords = useMemo((): DataTableRecord[] => {
    // Flatten nested objects for better display
    const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
      const flattened: Record<string, unknown> = {};

      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, flattenObject(value as Record<string, unknown>, newKey));
        } else {
          flattened[newKey] = value;
        }
      });

      return flattened;
    };

    const flattened = flattenObject(jsonObject);

    // Filter fields if columns prop is provided
    const fieldsToShow = columns
      ? Object.keys(flattened).filter((key) => columns.includes(key))
      : Object.keys(flattened);

    // Create a row for each field-value pair
    return fieldsToShow.map((fieldName, index) => {
      const value = flattened[fieldName];
      const fieldType = inferFieldType(value);
      const displayValue =
        value === null
          ? '-'
          : value === undefined
          ? '-'
          : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

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
  }, [jsonObject, title, columns]);

  // Grid columns configuration
  const gridColumns: EuiDataGridProps['columns'] = useMemo(
    () => [
      {
        id: 'field',
        displayAsText: 'Field',
        initialWidth: 200,
        actions: false,
      },
      {
        id: 'value',
        displayAsText: 'Value',
        actions: false,
      },
    ],
    []
  );

  // Cell renderer for the data grid
  const renderCellValue: EuiDataGridProps['renderCellValue'] = useMemo(() => {
    return ({ rowIndex, columnId }) => {
      const row = dataTableRecords[rowIndex];
      if (!row) return null;

      if (columnId === 'field') {
        const fieldName = row.flattened.field as string;
        const fieldType = row.flattened.fieldType as string;

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FieldIcon type={fieldType} size="s" />
            <span>{fieldName}</span>
          </div>
        );
      }

      if (columnId === 'value') {
        return <span>{row.flattened.value as string}</span>;
      }

      return null;
    };
  }, [dataTableRecords]);

  if (dataTableRecords.length === 0) {
    return <div>No data to display</div>;
  }

  return (
    <div className="kbnDocViewer" css={styles.fieldsGridWrapper} data-test-subj={dataTestSubj}>
      <EuiDataGrid
        className="kbnDocViewer__fieldsGrid"
        css={styles.fieldsGrid}
        aria-label={title || 'JSON Data Table'}
        columns={gridColumns}
        columnVisibility={{
          visibleColumns: ['field', 'value'],
          setVisibleColumns: () => {},
        }}
        rowCount={dataTableRecords.length}
        renderCellValue={renderCellValue}
        toolbarVisibility={{
          showColumnSelector: false,
          showDisplaySelector: false,
          showFullScreenSelector: false,
          showSortSelector: false,
        }}
        pagination={{
          pageIndex: 0,
          pageSize: Math.min(dataTableRecords.length, 10),
          pageSizeOptions: [10, 25, 50],
          onChangeItemsPerPage: () => {},
          onChangePage: () => {},
        }}
        sorting={{ columns: [], onSort: () => {} }}
        gridStyle={{
          border: 'none',
        }}
      />
    </div>
  );
}
