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
  PresentationContainer,
  TracksOverlays,
} from '@kbn/presentation-containers';
import {
  HasAppContext,
  HasType,
  PublishesDataViews,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesViewMode,
  PublishingSubject,
  ViewMode,
} from '@kbn/presentation-publishing';
import { ControlGroupApi } from '@kbn/controls-plugin/public';
import { Filter, Query, TimeRange } from '@kbn/es-query';
import { DashboardPanelMap } from '../../common';
import { SaveDashboardReturn } from '../services/dashboard_content_management/types';

export type DashboardApi = CanExpandPanels &
  HasAppContext &
  HasType<'dashboard'> &
  PresentationContainer &
  PublishesDataViews &
  Pick<PublishesPanelTitle, 'panelTitle'> &
  PublishesSavedObjectId &
  PublishesUnifiedSearch &
  PublishesViewMode &
  TracksOverlays & {
    addFromLibrary: () => void;
    asyncResetToLastSavedState: () => Promise<void>;
    controlGroupApi$: PublishingSubject<ControlGroupApi | undefined>;
    fullScreenMode$: PublishingSubject<boolean | undefined>;
    focusedPanelId$: PublishingSubject<string | undefined>;
    forceRefresh: () => void;
    getPanelsState: () => DashboardPanelMap;
    hasOverlays$: PublishingSubject<boolean | undefined>;
    hasRunMigrations$: PublishingSubject<boolean | undefined>;
    hasUnsavedChanges$: PublishingSubject<boolean | undefined>;
    managed$: PublishingSubject<boolean | undefined>;
    runInteractiveSave: (interactionMode: ViewMode) => Promise<SaveDashboardReturn | undefined>;
    runQuickSave: () => Promise<void>;
    scrollToTop: () => void;
    setFilters: (filters?: Filter[] | undefined) => void;
    setFullScreenMode: (fullScreenMode: boolean) => void;
    setQuery: (query?: Query | undefined) => void;
    setTags: (tags: string[]) => void;
    setTimeRange: (timeRange?: TimeRange | undefined) => void;
    setViewMode: (viewMode: ViewMode) => void;
    openSettingsFlyout: () => void;
  };
