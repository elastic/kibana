/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CanExpandPanels,
  HasRuntimeChildState,
  HasSerializedChildState,
  PresentationContainer,
  SerializedPanelState,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  EmbeddableAppContext,
  HasAppContext,
  HasType,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesPanelDescription,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishesWritableViewMode,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import {
  ControlGroupApi,
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
} from '@kbn/controls-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  DefaultEmbeddableApi,
  EmbeddablePackageState,
  ErrorEmbeddable,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Observable } from 'rxjs';
import { RefreshInterval, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import { DashboardOptions, DashboardPanelMap, DashboardPanelState } from '../../common';
import {
  LoadDashboardReturn,
  SaveDashboardReturn,
} from '../services/dashboard_content_management_service/types';
import { DashboardStateFromSettingsFlyout, UnsavedPanelState } from '../dashboard_container/types';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';

export const DASHBOARD_API_TYPE = 'dashboard';

export interface DashboardCreationOptions {
  getInitialInput?: () => Partial<DashboardState>;

  getIncomingEmbeddable?: () => EmbeddablePackageState | undefined;

  useSearchSessionsIntegration?: boolean;
  searchSessionSettings?: {
    sessionIdToRestore?: string;
    sessionIdUrlChangeObservable?: Observable<string | undefined>;
    getSearchSessionIdFromURL: () => string | undefined;
    removeSessionIdFromUrl: () => void;
    createSessionRestorationDataProvider: (dashboardApi: DashboardApi) => SearchSessionInfoProvider;
  };

  useSessionStorageIntegration?: boolean;

  useUnifiedSearchIntegration?: boolean;
  unifiedSearchSettings?: { kbnUrlStateStorage: IKbnUrlStateStorage };

  validateLoadedSavedObject?: (result: LoadDashboardReturn) => 'valid' | 'invalid' | 'redirected';

  isEmbeddedExternally?: boolean;

  getEmbeddableAppContext?: (dashboardId?: string) => EmbeddableAppContext;
}

export interface DashboardState {
  // filter context to be passed to children
  query: Query;
  filters: Filter[];
  timeRestore: boolean;
  timeRange?: TimeRange;
  timeslice?: [number, number];
  refreshInterval?: RefreshInterval;

  // dashboard meta info
  title: string;
  tags: string[];
  viewMode: ViewMode;
  description?: string;
  executionContext: KibanaExecutionContext;

  // dashboard options: TODO, build a new system to avoid all shared state appearing here. See https://github.com/elastic/kibana/issues/144532 for more information.
  hidePanelTitles: DashboardOptions['hidePanelTitles'];
  syncTooltips: DashboardOptions['syncTooltips'];
  useMargins: DashboardOptions['useMargins'];
  syncColors: DashboardOptions['syncColors'];
  syncCursor: DashboardOptions['syncCursor'];

  // dashboard contents
  panels: DashboardPanelMap;

  /**
   * Serialized control group state.
   * Contains state loaded from dashboard saved object
   */
  controlGroupInput?: ControlGroupSerializedState | undefined;
  /**
   * Runtime control group state.
   * Contains state passed from dashboard locator
   * Use runtime state when building input for portable dashboards
   */
  controlGroupState?: Partial<ControlGroupRuntimeState>;
}

export type DashboardApi = CanExpandPanels &
  HasAppContext &
  HasRuntimeChildState &
  HasSerializedChildState &
  HasType<typeof DASHBOARD_API_TYPE> &
  PresentationContainer &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesPanelDescription &
  Pick<PublishesPanelTitle, 'panelTitle'> &
  PublishesReload &
  PublishesSavedObjectId &
  PublishesUnifiedSearch &
  PublishesViewMode &
  PublishesWritableViewMode &
  TracksOverlays & {
    asyncResetToLastSavedState: () => Promise<void>;
    controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
    fullScreenMode$: PublishingSubject<boolean>;
    focusedPanelId$: PublishingSubject<string | undefined>;
    forceRefresh: () => void;
    getSettings: () => DashboardStateFromSettingsFlyout;
    getDashboardPanelFromId: (id: string) => Promise<DashboardPanelState>;
    hasOverlays$: PublishingSubject<boolean>;
    hasRunMigrations$: PublishingSubject<boolean>;
    hasUnsavedChanges$: PublishingSubject<boolean>;
    highlightPanel: (panelRef: HTMLDivElement) => void;
    highlightPanelId$: PublishingSubject<string | undefined>;
    isEmbeddedExternally: boolean;
    managed$: PublishingSubject<boolean>;
    panels$: PublishingSubject<DashboardPanelMap>;
    runInteractiveSave: (interactionMode: ViewMode) => Promise<SaveDashboardReturn | undefined>;
    runQuickSave: () => Promise<void>;
    scrollToPanel: (panelRef: HTMLDivElement) => void;
    scrollToPanelId$: PublishingSubject<string | undefined>;
    scrollToTop: () => void;
    setControlGroupApi: (controlGroupApi: ControlGroupApi) => void;
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setHighlightPanelId: (id: string | undefined) => void;
    setPanels: (panels: DashboardPanelMap) => void;
    setQuery: (query?: Query | undefined) => void;
    setScrollToPanelId: (id: string | undefined) => void;
    setSettings: (settings: DashboardStateFromSettingsFlyout) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    useMargins$: PublishingSubject<boolean | undefined>;
    // TODO replace with HasUniqueId once dashboard is refactored and navigateToDashboard is removed
    uuid$: PublishingSubject<string>;

    // TODO remove types below this line - from legacy embeddable system
    untilEmbeddableLoaded: (id: string) => Promise<IEmbeddable | ErrorEmbeddable>;
  };

export interface DashboardInternalApi {
  animatePanelTransforms$: PublishingSubject<boolean>;
  controlGroupReload$: PublishingSubject<void>;
  panelsReload$: PublishingSubject<void>;
  getRuntimeStateForControlGroup: () => UnsavedPanelState | undefined;
  getSerializedStateForControlGroup: () => SerializedPanelState<ControlGroupSerializedState>;
  registerChildApi: (api: DefaultEmbeddableApi) => void;
}
