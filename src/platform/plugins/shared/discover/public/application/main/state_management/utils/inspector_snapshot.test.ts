/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import type { InspectorSnapshot, Request } from '@kbn/inspector-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { dataViewMockWithTimeField } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getPersistedTabMock } from '../redux/__mocks__/internal_state.mocks';
import {
  createRuntimeStateManager,
  internalStateActions,
  selectAllTabs,
  selectTabRuntimeState,
} from '../redux';
import {
  DISCOVER_SNAPSHOT_APP_ID,
  getDiscoverSnapshotAppState,
  getSnapshotRestoreParams,
} from './inspector_snapshot';

const setup = async () => {
  const services = createDiscoverServicesMock();
  const runtimeStateManager = createRuntimeStateManager();
  const toolkit = getDiscoverInternalStateMock({
    services,
    runtimeStateManager,
    persistedDataViews: [dataViewMockWithTimeField],
  });
  await toolkit.initializeTabs({
    persistedDiscoverSession: createDiscoverSessionMock({
      id: 'test-session',
      tabs: [getPersistedTabMock({ dataView: dataViewMockWithTimeField, services })],
    }),
  });
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
  return toolkit;
};

const recordedRequest: Request = {
  id: 'docs',
  name: 'Data',
  startTime: 1,
  status: RequestStatus.OK,
  json: { query: { match_all: {} } },
  response: { json: { rawResponse: { hits: { hits: [] } } } },
};

describe('Discover inspector snapshot', () => {
  it('restores the same app, global and UI state in a new tab and activates the replay', async () => {
    const { internalState, runtimeStateManager, services, getCurrentTab } = await setup();
    const sourceTab = getCurrentTab();
    internalState.dispatch(
      internalStateActions.setDataGridUiState({
        tabId: sourceTab.id,
        dataGridUiState: { pageIndex: 2, isFilterActive: true },
      })
    );

    const appState = getDiscoverSnapshotAppState({
      data: services.data,
      getPersistedDiscoverSession: () => internalState.getState().persistedDiscoverSession,
      getCurrentTab,
      getCurrentTabRuntimeState: () => selectTabRuntimeState(runtimeStateManager, sourceTab.id),
      profileStateRegistry: services.profileStateRegistry,
      runtimeStateManager,
    });
    expect(appState.locatorParams.searchSessionId).toBeUndefined();
    // Included even for a persisted data view, so machine B does not need it
    expect(appState.locatorParams.dataViewSpec).toEqual(dataViewMockWithTimeField.toSpec());

    // The snapshot goes through a file, so only plain JSON survives
    const snapshot: InspectorSnapshot = JSON.parse(
      JSON.stringify({
        version: 1,
        meta: { kibanaVersion: '9.4.0', createdAt: '2026-11-02T10:00:00.000Z', title: 'Logs' },
        requests: { requests: [recordedRequest] },
        app: { id: DISCOVER_SNAPSHOT_APP_ID, state: appState },
      })
    );

    await internalState.dispatch(
      internalStateActions.openLocatorParamsInNewTab(getSnapshotRestoreParams(snapshot))
    );

    const tabs = selectAllTabs(internalState.getState());
    const restoredTab = tabs[tabs.length - 1];

    expect(restoredTab.id).not.toBe(sourceTab.id);
    expect(restoredTab.label).toBe('Logs (snapshot)');
    expect(Object.keys(restoredTab.appState)).toEqual(
      expect.arrayContaining(['query', 'columns', 'sort', 'dataSource'])
    );
    // createUrlGeneratorState defaults hideChart/hideTable/hideSidebar to false
    expect(restoredTab.appState).toEqual({
      ...pick(sourceTab.appState, Object.keys(restoredTab.appState)),
      hideChart: sourceTab.appState.hideChart ?? false,
      hideTable: sourceTab.appState.hideTable ?? false,
      hideSidebar: sourceTab.appState.hideSidebar ?? false,
    });
    expect(restoredTab.globalState.timeRange).toEqual(
      services.data.query.timefilter.timefilter.getAbsoluteTime()
    );
    expect(restoredTab.uiState.dataGrid).toEqual({ pageIndex: 2, isFilterActive: true });
    expect(restoredTab.attributes.visContext).toEqual(sourceTab.attributes.visContext);
    expect(services.data.search.replay.activate).toHaveBeenCalledWith([recordedRequest], {
      passthrough: false,
    });
    expect(
      selectTabRuntimeState(runtimeStateManager, restoredTab.id)?.replay$.getValue()?.meta
    ).toEqual(snapshot.meta);
  });
});
