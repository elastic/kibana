/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { UnifiedDataTable, DataLoadingState } from './src/components/data_table';
export type {
  UnifiedDataTableProps,
  SortOrder,
  RenderDocumentViewCallback,
  RenderDocumentViewMeta,
} from './src/components/data_table';
export {
  RowHeightSettings,
  type RowHeightSettingsProps,
} from './src/components/row_height_settings';
export {
  UnifiedDataTableAdditionalDisplaySettings,
  type UnifiedDataTableAdditionalDisplaySettingsProps,
} from './src/components/data_table_additional_display_settings';
export { getDisplayedColumns, SOURCE_COLUMN } from './src/utils/columns';
export { getTextBasedColumnsMeta } from './src/utils/get_columns_meta';
export {
  ROWS_HEIGHT_OPTIONS,
  DataGridDensity,
  DEFAULT_PAGINATION_MODE,
  defaultTimeColumnWidth,
} from './src/constants';

export { JSONCodeEditorCommonMemoized } from './src/components/json_code_editor/json_code_editor_common';
export { SourceDocument } from './src/components/source_document';

export type * from './src/types';
export * as columnActions from './src/components/actions/columns';

export { getRowsPerPageOptions } from './src/utils/rows_per_page';
export { popularizeField } from './src/utils/popularize_field';

export { useColumns, type UseColumnsProps } from './src/hooks/use_data_grid_columns';
export { OPEN_DETAILS, SELECT_ROW } from './src/components/data_table_columns'; // TODO: deprecate?

export type {
  UnifiedDataTableRenderCustomToolbar,
  UnifiedDataTableRenderCustomToolbarProps,
} from './src/components/custom_toolbar/render_custom_toolbar';
export {
  getRenderCustomToolbarWithElements,
  renderCustomToolbar,
} from './src/components/custom_toolbar/render_custom_toolbar';

export {
  getDataGridDensity,
  getDataGridDensityPadding,
  useDataGridDensity,
  DATA_GRID_DENSITY_STYLE_MAP,
} from './src/hooks/use_data_grid_density';
export { getRowHeight, useRowHeight, RowHeightType } from './src/hooks/use_row_height';
export { RowHeightMode } from './src/components/row_height_settings';

export type { UnifiedDataTableRestorableState } from './src/restorable_state';
export { UnifiedDataTableSourceColumnHeader } from './src/components/data_table_source_column_header';

export { getColumnDisplayName } from './src/components/data_table_columns';
export {
  buildCopyColumnNameButton,
  buildCopyColumnValuesButton,
} from './src/components/build_copy_column_button';
export { buildEditFieldButton } from './src/components/build_edit_field_button';
export { isSortable } from './src/hooks/use_sorting';
export { getSchemaByKbnType, getSchemaDetectors } from './src/components/data_table_schema';
export { convertValueToString } from './src/utils/convert_value_to_string';
export { CompareDocuments } from './src/components/compare_documents';
export {
  CopyAsTextFormat,
  copyRowsAsJsonToClipboard,
  copyRowsAsTextToClipboard,
} from './src/utils/copy_value_to_clipboard';

export { type EuiDataGridRefProps } from '@elastic/eui';
