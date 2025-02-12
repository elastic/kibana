/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/common';
import type {
  CustomCellRenderer,
  DataGridDensity,
  UnifiedDataTableProps,
} from '@kbn/unified-data-table';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { AppMenuRegistry, DataTableRecord } from '@kbn/discover-utils';
import type { CellAction, CellActionExecutionContext, CellActionsData } from '@kbn/cell-actions';
import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { OmitIndexSignature } from 'type-fest';
import type { Trigger } from '@kbn/ui-actions-plugin/public';
import type { FunctionComponent, PropsWithChildren } from 'react';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DiscoverDataSource } from '../../common/data_sources';
import type { DiscoverAppState } from '../application/main/state_management/discover_app_state_container';
import type { DiscoverStateContainer } from '../application/main/state_management/discover_state';

/**
 * Supports extending the Discover app menu
 */
export interface AppMenuExtension {
  /**
   * Supports extending the app menu with additional actions
   * @param prevRegistry The app menu registry
   * @returns The updated app menu registry
   */
  appMenuRegistry: (prevRegistry: AppMenuRegistry) => AppMenuRegistry;
}

/**
 * Parameters passed to the app menu extension
 */
export interface AppMenuExtensionParams {
  isEsqlMode: boolean;
  dataView: DataView | undefined;
  adHocDataViews: DataView[];
  onUpdateAdHocDataViews: (adHocDataViews: DataView[]) => Promise<void>;
}

/**
 * Supports customizing the Discover document viewer flyout
 */
export interface DocViewerExtension {
  /**
   * Title displayed in the flyout header
   */
  title: string | undefined;
  /**
   * Supports modifying existing tabs or adding new tabs to the flyout
   * @param prevRegistry The doc views registry
   * @returns The updated doc views registry
   */
  docViewsRegistry: (prevRegistry: DocViewsRegistry) => DocViewsRegistry;
}

/**
 * Parameters passed to the doc viewer extension
 */
export interface DocViewerExtensionParams {
  /**
   * The record being displayed in the doc viewer
   */
  record: DataTableRecord;
}

/**
 * Parameters passed to the row indicator extension
 */
export interface RowIndicatorExtensionParams {
  /**
   * The current data view
   */
  dataView: DataView;
}

/**
 * Default data grid column configuration
 */
export interface DefaultAppStateColumn {
  /**
   * The field name of the column
   */
  name: string;
  /**
   * The width of the column in pixels -- leave undefined for auto width
   */
  width?: number;
}

/**
 * Parameters passed to the default app state extension
 */
export interface DefaultAppStateExtensionParams {
  /**
   * The current data view
   */
  dataView: DataView;
}

/**
 * Supports customizing the default Discover application state
 */
export interface DefaultAppStateExtension {
  /**
   * The columns to display in the data grid
   */
  columns?: DefaultAppStateColumn[];
  /**
   * The height of each row in the data grid:
   * * -1: auto height mode
   * * 0: single line mode
   * * 1-20: number of lines to display
   */
  rowHeight?: number;
  /**
   * The field to apply for the histogram breakdown
   */
  breakdownField?: string;
}

/**
 * Parameters passed to the cell renderers extension
 */
export interface CellRenderersExtensionParams {
  /**
   * Available actions for cell renderers
   */
  actions: {
    addFilter?: DocViewFilterFn;
  };
  /**
   * The current data view
   */
  dataView: DataView;
  /**
   * The current density applied to the data grid component
   */
  density: DataGridDensity | undefined;
  /**
   * The current row height mode applied to the data grid component
   */
  rowHeight: number | undefined;
}

/**
 * Parameters passed to the row controls extension
 */
export interface RowControlsExtensionParams {
  /**
   * The current data view
   */
  dataView: DataView;
  /**
   * The current query
   */
  updateESQLQuery?: DiscoverStateContainer['actions']['updateESQLQuery'];
  /**
   * The current query
   */
  query?: DiscoverAppState['query'];
}

/**
 * The Discover cell actions trigger
 */
export const DISCOVER_CELL_ACTIONS_TRIGGER: Trigger = { id: 'DISCOVER_CELL_ACTIONS_TRIGGER_ID' };

/**
 * Metadata passed to Discover cell actions
 */
export interface DiscoverCellActionMetadata extends Record<string, unknown> {
  /**
   * The Discover instance ID (distinct for each dashboard panel)
   */
  instanceId?: string;
  /**
   * The current data source (ES|QL or data view)
   */
  dataSource?: DiscoverDataSource;
  /**
   * The current data view
   */
  dataView?: DataView;
  /**
   * The current query
   */
  query?: Query | AggregateQuery;
  /**
   * The current filters
   */
  filters?: Filter[];
  /**
   * The current time range
   */
  timeRange?: TimeRange;
}

export interface DiscoverCellActionExecutionContext extends CellActionExecutionContext {
  metadata: DiscoverCellActionMetadata | undefined;
}

export type DiscoverCellAction = CellAction<DiscoverCellActionExecutionContext>;

/**
 * Context object passed to additional cell action methods
 */
export type AdditionalCellActionContext = CellActionsData &
  Omit<OmitIndexSignature<DiscoverCellActionMetadata>, 'instanceId'>;

/**
 * Additional action to show within expanded cell popovers in the data grid
 */
export interface AdditionalCellAction {
  /**
   * Unique ID for the action
   */
  id: string;
  /**
   * Gets the display name for the action, used for button text
   * @param context Current cell action context
   * @returns The action display name
   */
  getDisplayName: (context: AdditionalCellActionContext) => string;
  /**
   * Gets the icon type for the action, used for button icon
   * @param context Current cell action context
   * @returns The action icon type
   */
  getIconType: (context: AdditionalCellActionContext) => EuiIconType;
  /**
   * Checks if the action is compatible with the current cell
   * @param context The current cell action context
   * @returns `true` if the action is compatible, `false` otherwise
   */
  isCompatible?: (
    context: Omit<AdditionalCellActionContext, 'value'>
  ) => boolean | Promise<boolean>;
  /**
   * The action to execute when the button is clicked
   * @param context The current cell action context
   */
  execute: (context: AdditionalCellActionContext) => void | Promise<void>;
}

/**
 * The core profile interface for Discover context awareness.
 * Each of the available methods map to a specific extension point in the Discover application.
 */
export interface Profile {
  /**
   * Lifecycle
   */

  /**
   * Render a custom wrapper component around the Discover application,
   * e.g. to allow using profile specific context providers
   * @param props The app wrapper props
   * @returns The custom app wrapper component
   */
  getRenderAppWrapper: FunctionComponent<PropsWithChildren<{}>>;

  /**
   * Gets default Discover app state that should be used when the profile is resolved
   * @param params The default app state extension parameters
   * @returns The default app state
   */
  getDefaultAppState: (params: DefaultAppStateExtensionParams) => DefaultAppStateExtension;

  /**
   * Gets an array of default ad hoc data views to display in the data view picker (e.g. "All logs").
   * The returned specs must include consistent IDs across resolutions for Discover to manage them correctly.
   * @returns The default data views to display in the data view picker
   */
  getDefaultAdHocDataViews: () => Array<
    Omit<DataViewSpec, 'id'> & { id: NonNullable<DataViewSpec['id']> }
  >;

  /**
   * Data grid
   */

  /**
   * Gets a map of column names to custom cell renderers to use in the data grid
   * @returns The custom cell renderers to use in the data grid
   */
  getCellRenderers: (params: CellRenderersExtensionParams) => CustomCellRenderer;

  /**
   * Gets a row indicator provider, allowing rows in the data grid to be given coloured highlights
   * based on the properties of each result (e.g. highlighting logs based on `log.level`)
   * @param params The row indicator extension parameters
   * @returns The row indicator provider to use in the data grid
   */
  getRowIndicatorProvider: (
    params: RowIndicatorExtensionParams
  ) => UnifiedDataTableProps['getRowIndicator'] | undefined;

  /**
   * Gets additional leading controls (row actions) to display for each row in the data grid
   * @param params The row controls extension parameters
   * @returns The additional leading controls to display in the data grid
   */
  getRowAdditionalLeadingControls: (
    params: RowControlsExtensionParams
  ) => UnifiedDataTableProps['rowAdditionalLeadingControls'] | undefined;

  /**
   * Gets additional cell actions to show within expanded cell popovers in the data grid
   * @returns The additional cell actions to show in the data grid
   */
  getAdditionalCellActions: () => AdditionalCellAction[];

  /**
   * Document viewer flyout
   */

  /**
   * Supports customizing the behaviour of the Discover document
   * viewer flyout, such as the flyout title and available tabs
   * @param params The doc viewer extension parameters
   * @returns The doc viewer extension
   */
  getDocViewer: (params: DocViewerExtensionParams) => DocViewerExtension;

  /**
   * App Menu (Top Nav actions)
   */

  /**
   * Supports extending the app menu with additional actions
   * The `getAppMenu` extension point gives access to AppMenuRegistry with methods registerCustomAction and registerCustomActionUnderSubmenu.
   * The extension also provides the essential params like current dataView, adHocDataViews etc when defining a custom action implementation.
   * And it supports opening custom flyouts and any other modals on the click.
   * `getAppMenu` can be configured in both root and data source profiles.
   * Note: Only 2 custom actions are allowed to be rendered in the app menu. The rest will be ignored.
   * @param params The app menu extension parameters
   * @returns The app menu extension
   */
  getAppMenu: (params: AppMenuExtensionParams) => AppMenuExtension;
}
