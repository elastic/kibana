/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import type { RestorableStateProviderProps } from '@kbn/restorable-state';
import type { ReactElement } from 'react';
import type { DocViewsRegistry } from './doc_views_registry';

/**
 * Represents the restorable state for all doc viewer tabs, keyed by tab ID.
 * Each tab can store its own state as needed.
 */
export type DocViewerTabsState = Record<string, unknown>;

export interface DocViewerRestorableState {
  /**
   * Represents the restorable state for all doc viewer tabs, keyed by tab ID.
   * Each tab can store its own state as needed.
   */
  docViewerTabsState?: DocViewerTabsState;
}

export interface FieldMapping {
  filterable?: boolean;
  scripted?: boolean;
  rowCount?: number;
  type: string;
  name: string;
  displayName?: string;
}

export type DocViewFilterFn = (
  mapping: FieldMapping | string | undefined,
  value: unknown,
  mode: '+' | '-'
) => void;

export interface DocViewRenderProps {
  hit: DataTableRecord;
  dataView: DataView;
  columns?: string[];
  /**
   * If not provided, types will be derived by default from the dataView field types.
   * For displaying text-based search results, define column types (which are available separately in the fetch request) here.
   */
  columnsMeta?: DataTableColumnsMeta;
  query?: Query | AggregateQuery;
  textBasedHits?: DataTableRecord[];
  hideActionsColumn?: boolean;
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
  docViewsRegistry?: DocViewsRegistry | ((prevRegistry: DocViewsRegistry) => DocViewsRegistry);
  decreaseAvailableHeightBy?: number;
}

export type DocViewerComponent = React.FC<DocViewRenderProps>;

export type DocViewRenderFunction<TState extends object = object> = (
  props: DocViewRenderProps & RestorableStateProviderProps<TState>
) => ReactElement;

export interface DocView<TState extends object = object> {
  id: string;
  order: number;
  title: string;
  enabled?: boolean;
  render: DocViewRenderFunction<TState>;
}
