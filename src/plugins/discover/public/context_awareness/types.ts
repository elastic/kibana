/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CustomCellRenderer, UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldsSubgroup, GetFieldSubgroupId } from '@kbn/unified-field-list';

export interface DocViewerExtension {
  title: string | undefined;
  docViewsRegistry: (prevRegistry: DocViewsRegistry) => DocViewsRegistry;
}

export interface DocViewerExtensionParams {
  record: DataTableRecord;
}

export interface DefaultAppStateColumns {
  name: string;
  width?: number;
}

export interface DefaultAppStateExtensionParams {
  dataView: DataView;
}

export interface DefaultAppStateExtension {
  columns?: DefaultAppStateColumns[];
  rowHeight?: number;
}

export interface Profile {
  getCellRenderers: () => CustomCellRenderer;
  getDocViewer: (params: DocViewerExtensionParams) => DocViewerExtension;
  getDefaultAppState: (params: DefaultAppStateExtensionParams) => DefaultAppStateExtension;
  getRowIndicatorColor: UnifiedDataTableProps['getRowIndicatorColor'];
  getFieldListSubgroups: () => {
    subgroups: FieldsSubgroup[];
    getSubgroupId: GetFieldSubgroupId;
  };
}
