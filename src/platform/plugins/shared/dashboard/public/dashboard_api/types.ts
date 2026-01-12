/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { Filter, ProjectRouting, Query, TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable, PublishesESQLVariables } from '@kbn/esql-types';
import type { GridLayoutData } from '@kbn/grid-layout';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type {
  CanExpandPanels,
  CanPinPanels,
  HasLastSavedChildState,
  HasSections,
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
  PublishesEditablePauseFetch,
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
import type { TimeSlice } from '@kbn/controls-schemas';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { BehaviorSubject, Observable, Subject } from 'rxjs';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardReadResponseBody, DashboardState, GridData } from '../../server';
import type { SaveDashboardReturn } from './save_modal/types';
import type { DashboardLayout } from './layout_manager/types';
import type { DashboardSettings } from './settings_manager';

export const DASHBOARD_API_TYPE = 'dashboard';

export const ReservedLayoutItemTypes: readonly string[] = ['section'] as const;

export interface DashboardCreationOptions {
  getInitialInput?: () => Partial<DashboardState & { viewMode?: ViewMode }>;

  getPassThroughContext?: PassThroughContext['getPassThroughContext'];

  getIncomingEmbeddables?: () => EmbeddablePackageState[] | undefined;

  useSearchSessionsIntegration?: boolean;
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

  useSessionStorageIntegration?: boolean;

  useUnifiedSearchIntegration?: boolean;
  unifiedSearchSettings?: { kbnUrlStateStorage: IKbnUrlStateStorage };

  validateLoadedSavedObject?: (
    result: DashboardReadResponseBody
  ) => 'valid' | 'invalid' | 'redirected';

  fullScreenMode?: boolean;
  isEmbeddedExternally?: boolean;

  getEmbeddableAppContext?: (dashboardId?: string) => EmbeddableAppContext;
}

export type DashboardApi = CanExpandPanels &
  CanPinPanels &
  HasSections &
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
  PublishesEditablePauseFetch &
  TrackContentfulRender &
  TracksOverlays & {
    asyncResetToLastSavedState: () => Promise<void>;
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

    publishedChildFilters$: PublishingSubject<Filter[] | undefined>;
    unpublishedChildFilters$: PublishingSubject<Filter[] | undefined>;
    publishFilters: () => void;

    publishedTimeslice$: PublishingSubject<TimeSlice | undefined>;
    unpublishedTimeslice$: PublishingSubject<TimeSlice | undefined>;
    publishTimeslice: () => void;

    layout$: BehaviorSubject<DashboardLayout>;

    registerChildApi: (api: DefaultEmbeddableApi) => void;

    accessControl$: PublishingSubject<Partial<SavedObjectAccessControl>>;
    changeAccessMode: (accessMode: SavedObjectAccessControl['accessMode']) => Promise<void>;
    createdBy?: string;
    user?: DashboardUser;
    isAccessControlEnabled?: boolean;
  };

export interface DashboardInternalApi {
  gridLayout$: BehaviorSubject<GridLayoutData>;
  serializeLayout: () => Pick<DashboardState, 'panels' | 'controlGroupInput' | 'references'>;
  isSectionCollapsed: (sectionId?: string) => boolean;
  dashboardContainerRef$: BehaviorSubject<HTMLElement | null>;
  setDashboardContainerRef: (ref: HTMLElement | null) => void;
  publishedEsqlVariables$: PublishingSubject<ESQLControlVariable[]>;
  unpublishedEsqlVariables$: PublishingSubject<ESQLControlVariable[]>;
  publishVariables: () => void;
  arePanelsRelated$: BehaviorSubject<(a: string, b: string) => boolean>;
}

export interface DashboardUser {
  uid: string;
  hasGlobalAccessControlPrivilege: boolean;
}
