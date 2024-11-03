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
  PublishesDataViews,
  PublishesPanelDescription,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { ControlGroupApi, ControlGroupSerializedState } from '@kbn/controls-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import {
  DefaultEmbeddableApi,
  EmbeddablePackageState,
  ErrorEmbeddable,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { Observable } from 'rxjs';
import { SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { DashboardPanelMap, DashboardPanelState } from '../../common';
import {
  LoadDashboardReturn,
  SaveDashboardReturn,
  SavedDashboardInput,
} from '../services/dashboard_content_management_service/types';
import { DashboardStateFromSettingsFlyout, UnsavedPanelState } from '../dashboard_container/types';

export interface DashboardCreationOptions {
  getInitialInput?: () => Partial<SavedDashboardInput>;

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

export type DashboardApi = CanExpandPanels &
  HasAppContext &
  HasRuntimeChildState &
  HasSerializedChildState &
  HasType<'dashboard'> &
  PresentationContainer &
  PublishesDataViews &
  PublishesPanelDescription &
  Pick<PublishesPanelTitle, 'panelTitle'> &
  PublishesSavedObjectId &
  PublishesUnifiedSearch &
  PublishesViewMode &
  TracksOverlays & {
    addFromLibrary: () => void;
    animatePanelTransforms$: PublishingSubject<boolean>;
    asyncResetToLastSavedState: () => Promise<void>;
    controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
    fullScreenMode$: PublishingSubject<boolean>;
    focusedPanelId$: PublishingSubject<string | undefined>;
    forceRefresh: () => void;
    getRuntimeStateForControlGroup: () => UnsavedPanelState | undefined;
    getSerializedStateForControlGroup: () => SerializedPanelState<ControlGroupSerializedState>;
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
    registerChildApi: (api: DefaultEmbeddableApi) => void;
    runInteractiveSave: (interactionMode: ViewMode) => Promise<SaveDashboardReturn | undefined>;
    runQuickSave: () => Promise<void>;
    scrollToPanel: (panelRef: HTMLDivElement) => void;
    scrollToPanelId$: PublishingSubject<string | undefined>;
    scrollToTop: () => void;
    setControlGroupApi: (controlGroupApi: ControlGroupApi) => void;
    setSettings: (settings: DashboardStateFromSettingsFlyout) => void;
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setPanels: (panels: DashboardPanelMap) => void;
    setQuery: (query?: Query | undefined) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    setViewMode: (viewMode: ViewMode) => void;
    useMargins$: PublishingSubject<boolean | undefined>;
    // TODO replace with HasUniqueId once dashboard is refactored and navigateToDashboard is removed
    uuid$: PublishingSubject<string>;

    // TODO remove types below this line - from legacy embeddable system
    untilEmbeddableLoaded: (id: string) => Promise<IEmbeddable | ErrorEmbeddable>;
  };
