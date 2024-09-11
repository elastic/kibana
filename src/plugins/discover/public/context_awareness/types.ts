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
import type { CellAction, CellActionExecutionContext, CellActionsData } from '@kbn/cell-actions';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { OmitIndexSignature } from 'type-fest';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { DiscoverDataSource } from '../../common/data_sources';

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

export interface CellRenderersExtensionParams {
  rowHeight: number | undefined;
}

export interface RowControlsExtensionParams {
  dataView: DataView;
}

export const DISCOVER_CELL_ACTIONS_TRIGGER: Trigger = { id: 'DISCOVER_CELL_ACTIONS_TRIGGER_ID' };

export interface DiscoverCellActionMetadata extends Record<string, unknown> {
  instanceId?: string;
  dataSource?: DiscoverDataSource;
  dataView?: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
}

export interface DiscoverCellActionExecutionContext extends CellActionExecutionContext {
  metadata: DiscoverCellActionMetadata | undefined;
}

export type DiscoverCellAction = CellAction<DiscoverCellActionExecutionContext>;

export type AdditionalCellActionContext = CellActionsData &
  Omit<OmitIndexSignature<DiscoverCellActionMetadata>, 'instanceId'>;

export interface AdditionalCellAction {
  id: string;
  getDisplayName: (context: AdditionalCellActionContext) => string;
  getIconType: (context: AdditionalCellActionContext) => EuiIconType;
  isCompatible?: (
    context: Omit<AdditionalCellActionContext, 'value'>
  ) => boolean | Promise<boolean>;
  execute: (context: AdditionalCellActionContext) => void | Promise<void>;
}

export interface Profile {
  getDefaultAppState: (params: DefaultAppStateExtensionParams) => DefaultAppStateExtension;
  // Data grid
  getCellRenderers: (params: CellRenderersExtensionParams) => CustomCellRenderer;
  getRowIndicatorProvider: (
    params: RowIndicatorExtensionParams
  ) => UnifiedDataTableProps['getRowIndicator'] | undefined;
  getRowAdditionalLeadingControls: (
    params: RowControlsExtensionParams
  ) => UnifiedDataTableProps['rowAdditionalLeadingControls'] | undefined;
  getAdditionalCellActions: () => AdditionalCellAction[];
  // Doc viewer
  getDocViewer: (params: DocViewerExtensionParams) => DocViewerExtension;
}
