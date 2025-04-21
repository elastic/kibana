/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { RefreshInterval, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DefaultEmbeddableApi, EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { PublishesESQLVariables } from '@kbn/esql-types';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  CanExpandPanels,
  HasLastSavedChildState,
  HasSerializedChildState,
  PresentationContainer,
  PublishesSettings,
  TrackContentfulRender,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  SerializedPanelState,
  EmbeddableAppContext,
  HasAppContext,
  HasExecutionContext,
  HasType,
  HasUniqueId,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesDescription,
  PublishesTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishesWritableViewMode,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { PublishesReload } from '@kbn/presentation-publishing/interfaces/fetch/publishes_reload';
import { PublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord, Writable } from '@kbn/utility-types';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { DashboardPanelMap } from '../../common';
import type {
  DashboardAttributes,
  DashboardOptions,
  GridData,
} from '../../server/content_management';
import type { DashboardPanel } from '../../server/content_management';
import {
  LoadDashboardReturn,
  SaveDashboardReturn,
} from '../services/dashboard_content_management_service/types';

export const DASHBOARD_API_TYPE = 'dashboard';

export type DashboardLayoutItem = { gridData: GridData } & HasType;
export interface DashboardLayout {
  [uuid: string]: DashboardLayoutItem;
}

export interface DashboardChildState {
  [uuid: string]: SerializedPanelState<object>;
}

export interface DashboardChildren {
  [uuid: string]: DefaultEmbeddableApi;
}

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

export type DashboardSettings = Writable<DashboardOptions> & {
  description?: DashboardAttributes['description'];
  tags: string[];
  timeRestore: DashboardAttributes['timeRestore'];
  title: DashboardAttributes['description'];
};

export interface DashboardState extends DashboardSettings {
  query: Query;
  filters: Filter[];
  timeRange?: TimeRange;
  refreshInterval?: RefreshInterval;
  viewMode: ViewMode;
  panels: DashboardPanelMap;

  /**
   * Temporary. Currently Dashboards are in charge of providing references to all of their children.
   * Eventually this will be removed in favour of the Dashboard injecting references serverside.
   */
  references?: Reference[];

  /**
   * Serialized control group state.
   * Contains state loaded from dashboard saved object
   */
  controlGroupInput?: ControlGroupSerializedState | undefined;
}

export type DashboardLocatorParams = Partial<
  Omit<DashboardState, 'panels' | 'controlGroupInput' | 'references'>
> & {
  /**
   * If given, the dashboard saved object with this id will be loaded. If not given,
   * a new, unsaved dashboard will be loaded up.
   */
  dashboardId?: string;

  /**
   * If not given, will use the uiSettings configuration for `storeInSessionStorage`. useHash determines
   * whether to hash the data in the url to avoid url length issues.
   */
  useHash?: boolean;

  /**
   * When `true` filters from saved filters from destination dashboard as merged with applied filters
   * When `false` applied filters take precedence and override saved filters
   *
   * true is default
   */
  preserveSavedFilters?: boolean;

  /**
   * Search search session ID to restore.
   * (Background search)
   */
  searchSessionId?: string;

  /**
   * List of dashboard panels
   */
  panels?: Array<DashboardPanel & SerializableRecord>; // used SerializableRecord here to force the GridData type to be read as serializable
};

export type DashboardApi = CanExpandPanels &
  HasAppContext &
  HasExecutionContext &
  HasLastSavedChildState &
  HasSerializedChildState &
  HasType<typeof DASHBOARD_API_TYPE> &
  HasUniqueId &
  PresentationContainer &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesDescription &
  Pick<PublishesTitle, 'title$'> &
  PublishesReload &
  PublishesSavedObjectId &
  PublishesESQLVariables &
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
    setFocusedPanelId: (id: string | undefined) => void;
    forceRefresh: () => void;
    getSettings: () => DashboardSettings;
    getSerializedState: () => {
      attributes: DashboardAttributes;
      references: Reference[];
    };
    getDashboardPanelFromId: (id: string) => {
      type: string;
      gridData: GridData;
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
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setHighlightPanelId: (id: string | undefined) => void;
    setQuery: (query?: Query | undefined) => void;
    setScrollToPanelId: (id: string | undefined) => void;
    setSettings: (settings: DashboardSettings) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    unifiedSearchFilters$: PublishesUnifiedSearch['filters$'];
  };

export interface DashboardInternalApi {
  controlGroupReload$: Subject<void>;
  panelsReload$: Subject<void>;
  layout$: BehaviorSubject<DashboardLayout>;
  registerChildApi: (api: DefaultEmbeddableApi) => void;
  setControlGroupApi: (controlGroupApi: ControlGroupApi) => void;
}
