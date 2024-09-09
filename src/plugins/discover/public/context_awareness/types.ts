/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { CustomCellRenderer, UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataTableRecord } from '@kbn/discover-utils';

export interface DocViewerExtension {
  title: string | undefined;
  docViewsRegistry: (prevRegistry: DocViewsRegistry) => DocViewsRegistry;
}

export interface DocViewerExtensionParams {
  record: DataTableRecord;
}

export interface RowIndicatorExtensionParams {
  dataView: DataView;
}

export interface DefaultAppStateColumn {
  name: string;
  width?: number;
}

export interface DefaultAppStateExtensionParams {
  dataView: DataView;
}

export interface DefaultAppStateExtension {
  columns?: DefaultAppStateColumn[];
  rowHeight?: number;
}

export interface RowControlsExtensionParams {
  dataView: DataView;
}

export interface Profile {
  getDefaultAppState: (params: DefaultAppStateExtensionParams) => DefaultAppStateExtension;
  // Data grid
  getCellRenderers: () => CustomCellRenderer;
  getRowIndicatorProvider: (
    params: RowIndicatorExtensionParams
  ) => UnifiedDataTableProps['getRowIndicator'] | undefined;
  getRowAdditionalLeadingControls: (
    params: RowControlsExtensionParams
  ) => UnifiedDataTableProps['rowAdditionalLeadingControls'] | undefined;
  // Doc viewer
  getDocViewer: (params: DocViewerExtensionParams) => DocViewerExtension;
}
