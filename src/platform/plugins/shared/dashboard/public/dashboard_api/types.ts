/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { ControlGroupApi } from '@kbn/controls-plugin/public';
import type { SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import type { PublishesESQLVariables } from '@kbn/esql-types';
import type { GridLayoutData } from '@kbn/grid-layout';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type {
  CanAddNewSection,
  CanExpandPanels,
  HasLastSavedChildState,
  HasSerializedChildState,
  PassThroughContext,
  PresentationContainer,
  PublishesSettings,
  TrackContentfulRender,
} from '@kbn/presentation-containers';
import type {
  EmbeddableAppContext,
  HasAppContext,
  HasExecutionContext,
  HasType,
  HasUniqueId,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesDescription,
  PublishesPauseFetch,
  PublishesSavedObjectId,
  PublishesTitle,
  PublishesUnifiedSearch,
  PublishesProjectRouting,
  PublishesViewMode,
  PublishesWritableViewMode,
  PublishingSubject,
  SerializedPanelState,
  ViewMode,
} from '@kbn/presentation-publishing';
import type { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import type { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { type TracksOverlays } from '@kbn/presentation-util';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { BehaviorSubject, Observable, Subject } from 'rxjs';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardReadResponseBody, DashboardState, GridData } from '../../server';
import type { SaveDashboardReturn } from './save_modal/types';
import type { DashboardLayout } from './layout_manager/types';
import type { DashboardSettings } from './settings_manager';

/** The type identifier for dashboard APIs. */
export const DASHBOARD_API_TYPE = 'dashboard';

export const ReservedLayoutItemTypes: readonly string[] = ['section'] as const;

/**
 * Options for creating a dashboard.
 * These options control how the dashboard is initialized and integrates with various Kibana features.
 */
export interface DashboardCreationOptions {
  /** Returns the initial dashboard state and view mode. */
  getInitialInput?: () => Partial<DashboardState & { viewMode?: ViewMode }>;

  /** Returns context to pass through to child embeddables. */
  getPassThroughContext?: PassThroughContext['getPassThroughContext'];

  /** Returns embeddables to add to the dashboard on load. */
  getIncomingEmbeddables?: () => EmbeddablePackageState[] | undefined;

  /** Whether to enable search sessions integration. */
  useSearchSessionsIntegration?: boolean;
  /** Settings for search session integration. */
  searchSessionSettings?: {
    sessionIdToRestore?: string;
    sessionIdUrlChangeObservable?: Observable<string | undefined>;
    getSearchSessionIdFromURL: () => string | undefined;
    removeSessionIdFromUrl: () => void;
    createSessionRestorationDataProvider: (
      dashboardApi: DashboardApi,
      dashboardInternalApi: DashboardInternalApi
    ) => SearchSessionInfoProvider;
  };

  /** Whether to enable session storage integration. */
  useSessionStorageIntegration?: boolean;

  /** Whether to enable unified search integration. */
  useUnifiedSearchIntegration?: boolean;
  /** Settings for unified search integration. */
  unifiedSearchSettings?: { kbnUrlStateStorage: IKbnUrlStateStorage };

  /**
   * Validates a loaded saved object and determines whether it is valid.
   *
   * @param result - The loaded dashboard response body.
   * @returns The validation result: 'valid', 'invalid', or 'redirected'.
   */
  validateLoadedSavedObject?: (
    result: DashboardReadResponseBody
  ) => 'valid' | 'invalid' | 'redirected';

  /** Whether to start the dashboard in full screen mode. */
  fullScreenMode?: boolean;
  /** Whether the dashboard is embedded externally (outside Kibana). */
  isEmbeddedExternally?: boolean;

  /**
   * Returns the embeddable app context for the dashboard.
   *
   * @param dashboardId - The optional dashboard ID.
   * @returns The {@link EmbeddableAppContext} for the dashboard.
   */
  getEmbeddableAppContext?: (dashboardId?: string) => EmbeddableAppContext;
}

/**
 * The public API for interacting with a dashboard.
 * This type combines multiple capability interfaces to provide full dashboard functionality.
 */
export type DashboardApi = CanExpandPanels &
  CanAddNewSection &
  HasAppContext &
  HasExecutionContext &
  HasLastSavedChildState &
  HasSerializedChildState &
  HasType<typeof DASHBOARD_API_TYPE> &
  HasUniqueId &
  PassThroughContext &
  PresentationContainer &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesDescription &
  Pick<PublishesTitle, 'title$' | 'hideTitle$'> &
  PublishesReload &
  PublishesSavedObjectId &
  PublishesESQLVariables &
  PublishesSearchSession &
  PublishesSettings &
  PublishesUnifiedSearch &
  PublishesProjectRouting &
  PublishesViewMode &
  PublishesWritableViewMode &
  PublishesPauseFetch &
  TrackContentfulRender &
  TracksOverlays & {
    asyncResetToLastSavedState: () => Promise<void>;
    controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
    fullScreenMode$: PublishingSubject<boolean>;
    focusedPanelId$: PublishingSubject<string | undefined>;
    setFocusedPanelId: (id: string | undefined) => void;
    forceRefresh: () => void;
    getSettings: () => DashboardSettings;
    getSerializedState: () => {
      attributes: DashboardState;
      references: Reference[];
    };
    getDashboardPanelFromId: (id: string) => {
      type: string;
      grid: GridData;
      serializedState: SerializedPanelState;
    };
    hasOverlays$: PublishingSubject<boolean>;
    hasUnsavedChanges$: PublishingSubject<boolean>;
    highlightPanel: (panelRef: HTMLDivElement) => void;
    highlightPanelId$: PublishingSubject<string | undefined>;
    isEmbeddedExternally: boolean;
    isManaged: boolean;
    locator?: Pick<LocatorPublic<DashboardLocatorParams>, 'navigate' | 'getRedirectUrl'>;
    runInteractiveSave: () => Promise<SaveDashboardReturn | undefined>;
    runQuickSave: () => Promise<void>;
    scrollToPanel: (panelRef: HTMLDivElement) => void;
    scrollToPanelId$: PublishingSubject<string | undefined>;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    scrollToBottom$: Subject<void>;
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setHighlightPanelId: (id: string | undefined) => void;
    setQuery: (query?: Query | undefined) => void;
    setProjectRouting: (projectRouting?: ProjectRouting) => void;
    setScrollToPanelId: (id: string | undefined) => void;
    setSettings: (settings: DashboardSettings) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    unifiedSearchFilters$: PublishesUnifiedSearch['filters$'];
    accessControl$: PublishingSubject<Partial<SavedObjectAccessControl>>;
    changeAccessMode: (accessMode: SavedObjectAccessControl['accessMode']) => Promise<void>;
    createdBy?: string;
    user?: DashboardUser;
    isAccessControlEnabled?: boolean;
  };

export interface DashboardInternalApi {
  layout$: BehaviorSubject<DashboardLayout>;
  gridLayout$: BehaviorSubject<GridLayoutData>;
  registerChildApi: (api: DefaultEmbeddableApi) => void;
  setControlGroupApi: (controlGroupApi: ControlGroupApi) => void;
  serializeLayout: () => Pick<DashboardState, 'panels' | 'references'>;
  isSectionCollapsed: (sectionId?: string) => boolean;
  dashboardContainerRef$: BehaviorSubject<HTMLElement | null>;
  setDashboardContainerRef: (ref: HTMLElement | null) => void;
  serializeControls: () => {
    controlGroupInput: ControlsGroupState | undefined;
    controlGroupReferences: Reference[];
  };
}

export interface DashboardUser {
  uid: string;
  hasGlobalAccessControlPrivilege: boolean;
}
