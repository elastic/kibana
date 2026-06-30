/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridCellPopoverElementProps, euiFontSize } from '@elastic/eui';
import type * as React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  CustomCellRenderer,
  CustomGridColumnsConfiguration,
  DataTableColumnsMeta,
  SortOrder,
  UnifiedDataTable,
  UnifiedDataTableRenderCustomToolbar,
} from '@kbn/unified-data-table';
import type { TriggerEventTableRow } from './use_trigger_event_search';
import type { useKibana } from '../../../hooks/use_kibana';

export interface UseTriggerEventTableConfigOptions {
  services: ReturnType<typeof useKibana>['services'];
  dataView: DataView | null;
  rows: TriggerEventTableRow[];
  documentCount: number;
  replaySpaceId: string;
  setValue: (value: string) => void;
  setErrors?: (errors: string | null) => void;
  onTriggerEventTableSelectionCountChange?: (selectedCount: number) => void;
}

export interface UseTriggerEventTableConfigResult {
  visibleTableColumns: string[];
  showTimeColumn: boolean;
  sort: SortOrder[];
  dataTableRows: DataTableRecord[];
  columnsMeta: DataTableColumnsMeta;
  externalCustomRenderers: CustomCellRenderer;
  customGridColumnsConfiguration: CustomGridColumnsConfiguration;
  unifiedDataTableServices: React.ComponentProps<typeof UnifiedDataTable>['services'];
  getNoCellActions: UiActionsStart['getTriggerCompatibleActions'];
  handleSortChange: (nextSort: string[][]) => void;
  handleUnifiedDataTableSetColumns: (columns: string[], hideTimeColumn: boolean) => void;
  timestampCellTypography: ReturnType<typeof euiFontSize>;
  renderCustomToolbar: UnifiedDataTableRenderCustomToolbar;
  renderCellPopover: (popoverProps: EuiDataGridCellPopoverElementProps) => React.JSX.Element;
}
