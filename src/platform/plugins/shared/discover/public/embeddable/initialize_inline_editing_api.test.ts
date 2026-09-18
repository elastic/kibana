/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DiscoverGridSettings, SavedSearch, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type {
  DataTableColumnsMeta,
  SortOrder,
  DataGridDensity,
  JsonModeSettings,
  DocumentsDisplayMode,
} from '@kbn/unified-data-table';
import { BehaviorSubject } from 'rxjs';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getPersistedTabMock } from '../application/main/state_management/redux/__mocks__/internal_state.mocks';
import { initializeInlineEditingApi } from './initialize_inline_editing_api';
import type { SearchEmbeddableStateManager } from './types';

const defaultServices = createDiscoverServicesMock();

const tab1 = getPersistedTabMock({
  dataView: dataViewMock,
  services: defaultServices,
  tabId: 'tab-1',
});

const tab2 = getPersistedTabMock({
  dataView: dataViewMock,
  services: defaultServices,
  tabId: 'tab-2',
});

const createSearchEmbeddableStateManager = (): SearchEmbeddableStateManager => ({
  columns: new BehaviorSubject<string[] | undefined>(['message']),
  columnsMeta: new BehaviorSubject<DataTableColumnsMeta | undefined>(undefined),
  grid: new BehaviorSubject<DiscoverGridSettings | undefined>(undefined),
  rowHeight: new BehaviorSubject<number | undefined>(undefined),
  headerRowHeight: new BehaviorSubject<number | undefined>(undefined),
  rowsPerPage: new BehaviorSubject<number | undefined>(undefined),
  sampleSize: new BehaviorSubject<number | undefined>(100),
  sort: new BehaviorSubject<SortOrder[] | undefined>(undefined),
  viewMode: new BehaviorSubject<VIEW_MODE | undefined>(undefined),
  density: new BehaviorSubject<DataGridDensity | undefined>(undefined),
  documentsDisplayMode: new BehaviorSubject<DocumentsDisplayMode | undefined>(undefined),
  jsonModeSettings: new BehaviorSubject<JsonModeSettings | undefined>(undefined),
  rows: new BehaviorSubject<DataTableRecord[]>([]),
  totalHitCount: new BehaviorSubject<number | undefined>(undefined),
  inspectorAdapters: new BehaviorSubject<Record<string, unknown>>({}),
});

const createMockSavedSearch = (): SavedSearch => ({
  searchSource: createSearchSourceMock(),
  managed: false,
});

const buildSearchEmbeddable = () => ({
  api: { savedSearch$: new BehaviorSubject(createMockSavedSearch()) },
  reinitializeState: jest.fn().mockResolvedValue(undefined),
  stateManager: createSearchEmbeddableStateManager(),
});

const setupApi = (
  {
    parentApi,
    initialSelectedTabId = 'tab-1',
    savedObjectId = 'session-1',
  }: {
    parentApi: unknown;
    initialSelectedTabId?: string;
    savedObjectId?: string | undefined;
  } = { parentApi: {} }
) => {
  const analytics = analyticsServiceMock.createAnalyticsServiceStart();
  const selectedTabId$ = new BehaviorSubject<string | undefined>(initialSelectedTabId);
  const savedObjectId$ = new BehaviorSubject<string | undefined>(savedObjectId);
  const searchError$ = new BehaviorSubject<Error | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);
  const searchEmbeddable = buildSearchEmbeddable();

  const api = initializeInlineEditingApi({
    uuid: 'panel-1',
    parentApi,
    tabs: [tab1, tab2],
    analytics,
    selectedTabId$,
    savedObjectId$,
    searchEmbeddable,
    setSearchError: (error: Error | undefined) => searchError$.next(error),
    dataLoading$,
  });

  return {
    api,
    analytics,
    selectedTabId$,
    savedObjectId$,
    searchError$,
    dataLoading$,
    searchEmbeddable,
  };
};

describe('initializeInlineEditingApi', () => {
  it('restores the Metrics profile state snapshot when cancelling a tab preview', async () => {
    const { api, searchEmbeddable, selectedTabId$ } = setupApi();
    const { savedSearch$ } = searchEmbeddable.api;
    const tabTypeState: SavedSearch['tabTypeState'] = {
      type: DiscoverTabType.Metrics,
      dimensions: ['host.name'],
      searchTerm: 'cpu',
      counterAggregation: 'max',
      gaugeAggregation: 'avg',
      histogramPercentile: 'p99',
    };
    savedSearch$.next({ ...savedSearch$.getValue(), tabTypeState });

    await api.startInlineEditing();
    await api.previewInlineTabSelection('tab-2');
    expect(searchEmbeddable.reinitializeState).toHaveBeenNthCalledWith(1, tab2);

    savedSearch$.next({ ...savedSearch$.getValue(), tabTypeState: undefined });
    await api.cancelInlineTabSelection();

    expect(searchEmbeddable.reinitializeState).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tabTypeState })
    );
    expect(selectedTabId$.getValue()).toBe('tab-1');
    expect(api.isInlineEditing$.getValue()).toBe(false);
  });

  describe('applyInlineTabSelection telemetry', () => {
    it('reports a tabSwitched event with the dashboard id from the parent api', async () => {
      const parentApi = { savedObjectId$: new BehaviorSubject('dashboard-1') };
      const { api, analytics } = setupApi({ parentApi });

      api.isInlineEditing$.next(true);
      api.draftSelectedTabId$.next('tab-2');

      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
      expect(analytics.reportEvent).toHaveBeenCalledWith('discover_in_dashboard', {
        eventName: 'tabSwitched',
        dashboardId: 'dashboard-1',
        embeddablePanelId: 'panel-1',
        savedSessionId: 'session-1',
        tabSwitchedFromId: 'tab-1',
        tabSwitchedToId: 'tab-2',
      });
    });

    it('falls back to "new" when the parent api publishes an undefined saved object id', async () => {
      const parentApi = { savedObjectId$: new BehaviorSubject(undefined) };
      const { api, analytics } = setupApi({ parentApi });

      api.isInlineEditing$.next(true);
      api.draftSelectedTabId$.next('tab-2');

      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'discover_in_dashboard',
        expect.objectContaining({ dashboardId: 'new' })
      );
    });

    it('sets dashboardId to undefined when the parent api does not publish a saved object id', async () => {
      const { api, analytics } = setupApi({ parentApi: {} });

      api.isInlineEditing$.next(true);
      api.draftSelectedTabId$.next('tab-2');

      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).toHaveBeenCalledWith(
        'discover_in_dashboard',
        expect.objectContaining({ dashboardId: undefined })
      );
    });

    it('does not report when not in inline editing mode', async () => {
      const parentApi = { savedObjectId$: new BehaviorSubject('dashboard-1') };
      const { api, analytics } = setupApi({ parentApi });

      api.draftSelectedTabId$.next('tab-2');
      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not report when the draft tab matches the committed tab', async () => {
      const parentApi = { savedObjectId$: new BehaviorSubject('dashboard-1') };
      const { api, analytics } = setupApi({ parentApi });

      api.isInlineEditing$.next(true);
      api.draftSelectedTabId$.next('tab-1');

      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('does not report when the draft tab is not part of the tabs list', async () => {
      const parentApi = { savedObjectId$: new BehaviorSubject('dashboard-1') };
      const { api, analytics } = setupApi({ parentApi });

      api.isInlineEditing$.next(true);
      api.draftSelectedTabId$.next('unknown-tab');

      await api.applyInlineTabSelection();

      expect(analytics.reportEvent).not.toHaveBeenCalled();
    });
  });

  describe('failed tab switches', () => {
    const switchError = new Error('Tab state failed to load');

    // reinitializeState empties rows before it can reject, so a failed switch mutates applied
    // state without marking the edit dirty
    const failPreviewSwitch = async (
      { api, searchEmbeddable }: ReturnType<typeof setupApi>,
      tabId = 'tab-2'
    ) => {
      await api.startInlineEditing();
      searchEmbeddable.reinitializeState.mockRejectedValueOnce(switchError);
      await api.previewInlineTabSelection(tabId);
    };

    it('keeps the error visible and rolls the draft tab back', async () => {
      const setup = setupApi();

      await failPreviewSwitch(setup);

      // the error stays in-panel while editing so apply/discard remain reachable
      expect(setup.searchError$.getValue()).toBe(switchError);
      expect(setup.api.draftSelectedTabId$.getValue()).toBe('tab-1');
      expect(setup.api.inlineEditDirty$.getValue()).toBe(false);
    });

    it('restores the snapshot and clears the error when discarding', async () => {
      const setup = setupApi();

      await failPreviewSwitch(setup);
      setup.searchEmbeddable.reinitializeState.mockClear();

      await setup.api.cancelInlineTabSelection();

      // the failed switch leaves the edit clean, so a dirty-only check would skip the restore
      // and strand the error for the factory to promote to a blocking one
      expect(setup.searchEmbeddable.reinitializeState).toHaveBeenCalledTimes(1);
      expect(setup.searchError$.getValue()).toBeUndefined();
      expect(setup.api.isInlineEditing$.getValue()).toBe(false);
    });

    it('restores the snapshot and clears the error when applying with nothing to commit', async () => {
      const setup = setupApi();

      await failPreviewSwitch(setup);
      setup.searchEmbeddable.reinitializeState.mockClear();

      // the rollback left the draft on the committed tab, so there is no tab change to apply
      await setup.api.applyInlineTabSelection();

      expect(setup.searchEmbeddable.reinitializeState).toHaveBeenCalledTimes(1);
      expect(setup.searchError$.getValue()).toBeUndefined();
      expect(setup.api.isInlineEditing$.getValue()).toBe(false);
    });

    it('clears a stranded error when a later tab switch succeeds', async () => {
      const setup = setupApi();

      await failPreviewSwitch(setup);
      await setup.api.previewInlineTabSelection('tab-2');

      expect(setup.searchError$.getValue()).toBeUndefined();
      expect(setup.api.draftSelectedTabId$.getValue()).toBe('tab-2');
      expect(setup.api.inlineEditDirty$.getValue()).toBe(true);
    });

    it('keeps the error when the restore itself fails on discard', async () => {
      const setup = setupApi();
      const restoreError = new Error('Snapshot failed to load');

      await failPreviewSwitch(setup);
      setup.searchEmbeddable.reinitializeState.mockRejectedValueOnce(restoreError);

      await setup.api.cancelInlineTabSelection();

      expect(setup.searchError$.getValue()).toBe(restoreError);
      expect(setup.api.isInlineEditing$.getValue()).toBe(false);
    });

    it('restores the snapshot when discarding after a successful switch', async () => {
      const setup = setupApi();

      await setup.api.startInlineEditing();
      await setup.api.previewInlineTabSelection('tab-2');
      expect(setup.api.inlineEditDirty$.getValue()).toBe(true);
      setup.searchEmbeddable.reinitializeState.mockClear();

      await setup.api.cancelInlineTabSelection();

      expect(setup.searchEmbeddable.reinitializeState).toHaveBeenCalledTimes(1);
      expect(setup.selectedTabId$.getValue()).toBe('tab-1');
    });

    it('does not restore when editing stops without a failed switch', async () => {
      const setup = setupApi();

      await setup.api.startInlineEditing();
      setup.searchEmbeddable.reinitializeState.mockClear();

      await setup.api.cancelInlineTabSelection();

      expect(setup.searchEmbeddable.reinitializeState).not.toHaveBeenCalled();
    });

    it('resets dataLoading to false when a tab switch fails', async () => {
      const setup = setupApi();

      await setup.api.startInlineEditing();
      setup.dataLoading$.next(true);
      setup.searchEmbeddable.reinitializeState.mockRejectedValueOnce(switchError);

      await setup.api.previewInlineTabSelection('tab-2');

      expect(setup.dataLoading$.getValue()).toBe(false);
    });
  });
});
