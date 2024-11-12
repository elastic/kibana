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
  HasSaveNotification,
  HasSerializedChildState,
  PresentationContainer,
  PublishesSettings,
  SerializedPanelState,
  TrackContentfulRender,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  EmbeddableAppContext,
  HasAppContext,
  HasExecutionContext,
  HasType,
  HasUniqueId,
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
import { Observable, Subject } from 'rxjs';
import { RefreshInterval, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { DashboardPanelMap, DashboardPanelState } from '../../common';
import type { DashboardOptions } from '../../server/content_management';
import {
  LoadDashboardReturn,
  SaveDashboardReturn,
} from '../services/dashboard_content_management_service/types';
import {
  DashboardLocatorParams,
  DashboardStateFromSettingsFlyout,
} from '../dashboard_container/types';

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

  fullScreenMode?: boolean;
  isEmbeddedExternally?: boolean;

  getEmbeddableAppContext?: (dashboardId?: string) => EmbeddableAppContext;
}

export interface DashboardState {
  // filter context to be passed to children
  query: Query;
  filters: Filter[];
  timeRestore: boolean;
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;

  // dashboard meta info
  title: string;
  tags: string[];
  viewMode: ViewMode;
  description?: string;

  // settings
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
  HasExecutionContext &
  HasRuntimeChildState &
  HasSaveNotification &
  HasSerializedChildState &
  HasType<typeof DASHBOARD_API_TYPE> &
  HasUniqueId &
  PresentationContainer &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesPanelDescription &
  Pick<PublishesPanelTitle, 'panelTitle'> &
  PublishesReload &
  PublishesSavedObjectId &
  PublishesSearchSession &
  PublishesSettings &
  PublishesUnifiedSearch &
  PublishesViewMode &
  PublishesWritableViewMode &
  TrackContentfulRender &
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
    isManaged: boolean;
    locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
    panels$: PublishingSubject<DashboardPanelMap>;
    runInteractiveSave: () => Promise<SaveDashboardReturn | undefined>;
    runQuickSave: () => Promise<void>;
    scrollToPanel: (panelRef: HTMLDivElement) => void;
    scrollToPanelId$: PublishingSubject<string | undefined>;
    scrollToTop: () => void;
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setHighlightPanelId: (id: string | undefined) => void;
    setPanels: (panels: DashboardPanelMap) => void;
    setQuery: (query?: Query | undefined) => void;
    setScrollToPanelId: (id: string | undefined) => void;
    setSettings: (settings: DashboardStateFromSettingsFlyout) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    unifiedSearchFilters$: PublishesUnifiedSearch['filters$'];

    // TODO remove types below this line - from legacy embeddable system
    untilEmbeddableLoaded: (id: string) => Promise<IEmbeddable | ErrorEmbeddable>;
  };

export interface DashboardInternalApi {
  animatePanelTransforms$: PublishingSubject<boolean>;
  controlGroupReload$: Subject<void>;
  panelsReload$: Subject<void>;
  getRuntimeStateForControlGroup: () => object | undefined;
  getSerializedStateForControlGroup: () => SerializedPanelState<ControlGroupSerializedState>;
  registerChildApi: (api: DefaultEmbeddableApi) => void;
  setControlGroupApi: (controlGroupApi: ControlGroupApi) => void;
}
