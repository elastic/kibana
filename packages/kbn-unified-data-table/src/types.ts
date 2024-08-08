/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement, FC } from 'react';
import type {
  EuiDataGridCellValueElementProps,
  EuiDataGridColumn,
  IconType,
  EuiButtonIconProps,
} from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { EuiDataGridControlColumn } from '@elastic/eui/src/components/datagrid/data_grid_types';
import type { DatatableColumnMeta } from '@kbn/expressions-plugin/common';

/**
 * User configurable state of data grid, persisted in saved search
 */
export interface UnifiedDataTableSettings {
  columns?: Record<string, UnifiedDataTableSettingsColumn>;
}

export interface UnifiedDataTableSettingsColumn {
  width?: number;
  /**
  Optional props passed to Columns to display provided labels as column names instead of field names.
  This object maps column field names to their corresponding display labels.
  These labels will take precedence over the data view field names.
  */
  display?: string;
}

export type ValueToStringConverter = (
  rowIndex: number,
  columnId: string,
  options?: { compatibleWithCSV?: boolean }
) => { formattedString: string; withFormula: boolean };

/**
 * Custom column types per column name
 */
export type DataTableColumnsMeta = Record<
  string,
  {
    type: DatatableColumnMeta['type'];
    esType?: DatatableColumnMeta['esType'];
  }
>;

export type DataGridCellValueElementProps = EuiDataGridCellValueElementProps & {
  row: DataTableRecord;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  closePopover: () => void;
};

export type CustomCellRenderer = Record<
  string,
  (props: DataGridCellValueElementProps) => ReactElement
>;

export interface CustomGridColumnProps {
  column: EuiDataGridColumn;
  headerRowHeight?: number;
}

export type CustomGridColumnsConfiguration = Record<
  string,
  (props: CustomGridColumnProps) => EuiDataGridColumn
>;

export interface RowControlRowProps {
  rowIndex: number;
  record: DataTableRecord;
}

export interface RowControlProps {
  'data-test-subj'?: string;
  color?: EuiButtonIconProps['color'];
  disabled?: boolean;
  label: string;
  iconType: IconType;
  onClick: ((props: RowControlRowProps) => void) | undefined;
}

export type RowControlComponent = FC<RowControlProps>;

export interface RowControlColumn {
  id: string;
  headerAriaLabel: string;
  headerCellRender?: EuiDataGridControlColumn['headerCellRender'];
  renderControl: (Control: RowControlComponent, props: RowControlRowProps) => ReactElement;
}
