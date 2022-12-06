/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ReactElement } from 'react';

import { History } from 'history';
import { AnyAction, Dispatch } from 'redux';
import { BehaviorSubject, Subject } from 'rxjs';

import type { AppMountParameters, ScopedHistory, KibanaExecutionContext } from '@kbn/core/public';
import type { Filter } from '@kbn/es-query';
import type { PersistableControlGroupInput } from '@kbn/controls-plugin/common';
import { type EmbeddableInput, ViewMode } from '@kbn/embeddable-plugin/common';
import type { ContainerInput } from '@kbn/embeddable-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { RefreshInterval } from '@kbn/data-plugin/public';
import type { Query, TimeRange } from '@kbn/es-query';

import type { DashboardContainer } from './application';
import type { DashboardAppLocatorParams } from './locator';
import type { DashboardPanelMap, DashboardPanelState, SavedDashboardPanel } from '../common';

export type { SavedDashboardPanel };

export type NavAction = (anchorElement?: any) => void;

/**
 * DashboardState contains all pieces of tracked state for an individual dashboard
 */
export interface DashboardState {
  query: Query;
  title: string;
  tags: string[];
  filters: Filter[];
  viewMode: ViewMode;
  description: string;
  savedQuery?: string;
  timeRestore: boolean;
  timeRange?: TimeRange;
  savedObjectId?: string;
  fullScreenMode: boolean;
  expandedPanelId?: string;
  options: DashboardOptions;
  panels: DashboardPanelMap;
  refreshInterval?: RefreshInterval;
  timeslice?: [number, number];

  controlGroupInput?: PersistableControlGroupInput;
}

/**
 * RawDashboardState is the dashboard state as directly loaded from the panelJSON
 */
export type RawDashboardState = Omit<DashboardState, 'panels'> & { panels: SavedDashboardPanel[] };

export interface DashboardContainerInput extends ContainerInput {
  controlGroupInput?: PersistableControlGroupInput;
  refreshConfig?: RefreshInterval;
  isEmbeddedExternally?: boolean;
  isFullScreenMode: boolean;
  expandedPanelId?: string;
  timeRange: TimeRange;
  timeslice?: [number, number];
  timeRestore: boolean;
  description?: string;
  useMargins: boolean;
  syncColors?: boolean;
  syncTooltips?: boolean;
  syncCursor?: boolean;
  viewMode: ViewMode;
  filters: Filter[];
  title: string;
  query: Query;
  panels: {
    [panelId: string]: DashboardPanelState<EmbeddableInput & { [k: string]: unknown }>;
  };
  executionContext?: KibanaExecutionContext;
}

/**
 * DashboardAppState contains all the tools the dashboard application uses to track,
 * update, and view its state.
 */
export interface DashboardAppState {
  hasUnsavedChanges?: boolean;
  dataViews?: DataView[];
  updateLastSavedState?: () => void;
  resetToLastSavedState?: () => void;
  dashboardContainer?: DashboardContainer;
  createConflictWarning?: () => ReactElement | undefined;
  getLatestDashboardState?: () => DashboardState;
  $triggerDashboardRefresh: Subject<{ force?: boolean }>;
  $onDashboardStateChange: BehaviorSubject<DashboardState>;
}

/**
 * The shared services and tools used to build a dashboard from a saved object ID.
 */
export interface DashboardBuildContext {
  locatorState?: DashboardAppLocatorParams;
  history: History;
  isEmbeddedExternally: boolean;
  kbnUrlStateStorage: IKbnUrlStateStorage;
  $checkForUnsavedChanges: Subject<unknown>;
  getLatestDashboardState: () => DashboardState;
  dispatchDashboardStateChange: Dispatch<AnyAction>;
  $triggerDashboardRefresh: Subject<{ force?: boolean }>;
  $onDashboardStateChange: BehaviorSubject<DashboardState>;
  executionContext?: KibanaExecutionContext;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DashboardOptions = {
  hidePanelTitles: boolean;
  useMargins: boolean;
  syncColors: boolean;
  syncCursor: boolean;
  syncTooltips: boolean;
};

export type DashboardRedirect = (props: RedirectToProps) => void;
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };

export interface DashboardEmbedSettings {
  forceHideFilterBar?: boolean;
  forceShowTopNavMenu?: boolean;
  forceShowQueryInput?: boolean;
  forceShowDatePicker?: boolean;
}

export interface DashboardSaveOptions {
  newTitle: string;
  newTags?: string[];
  newDescription: string;
  newCopyOnSave: boolean;
  newTimeRestore: boolean;
  onTitleDuplicate: () => void;
  isTitleDuplicateConfirmed: boolean;
}

export interface DashboardMountContextProps {
  restorePreviousUrl: () => void;
  scopedHistory: () => ScopedHistory;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}
