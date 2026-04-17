/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common/types';
import { initializeInlineEditingApi } from './initialize_inline_editing_api';

const tabs = [{ id: 'tab-1' }, { id: 'tab-2' }] as unknown as DiscoverSessionTab[];

const buildSearchEmbeddable = () => ({
  api: { savedSearch$: new BehaviorSubject({}) as never },
  reinitializeState: jest.fn().mockResolvedValue(undefined),
  stateManager: {} as never,
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
  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(undefined);

  const api = initializeInlineEditingApi({
    uuid: 'panel-1',
    parentApi,
    tabs,
    analytics,
    selectedTabId$,
    savedObjectId$,
    searchEmbeddable: buildSearchEmbeddable(),
    blockingError$,
    dataLoading$,
  });

  return { api, analytics, selectedTabId$, savedObjectId$ };
};

describe('initializeInlineEditingApi', () => {
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
        tabSwitchedIdFrom: 'tab-1',
        tabSwitchedIdTo: 'tab-2',
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
});
