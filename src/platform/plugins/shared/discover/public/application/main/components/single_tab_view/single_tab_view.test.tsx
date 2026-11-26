/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataView } from '@kbn/data-views-plugin/common';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { dataViewWithNoTimefieldMock } from '../../../../__mocks__/data_view_no_timefield';
import { getPersistedTabMock } from '../../state_management/redux/__mocks__/internal_state.mocks';
import {
  getTabDataView,
  selectTab,
  selectTabRuntimeState,
  TabInitializationStatus,
} from '../../state_management/redux';
import { SingleTabView } from './single_tab_view';

jest.mock('./main_app', () => ({
  DiscoverMainApp: () => <div data-test-subj="discoverMainApp" />,
}));

describe('SingleTabView', () => {
  it('opens the tab with a data view created from the prompt when no persisted data views are left', async () => {
    const services = createDiscoverServicesMock();
    // The saved data view of the tab was deleted and no other persisted data view is left
    const persistedDataViews: DataView[] = [];
    const toolkit = getDiscoverInternalStateMock({ services, persistedDataViews });
    const persistedTab = getPersistedTabMock({ dataView: dataViewWithNoTimefieldMock, services });

    await toolkit.initializeTabs({
      persistedDiscoverSession: createDiscoverSessionMock({ id: 'test-id', tabs: [persistedTab] }),
    });
    jest.mocked(services.dataViews.hasData.hasDataView).mockResolvedValueOnce(false);

    render(
      <DiscoverToolkitTestProvider toolkit={toolkit}>
        <SingleTabView
          customizationContext={toolkit.customizationContext}
          customizationCallbacks={[]}
          urlStateStorage={toolkit.stateStorageContainer}
          internalState={toolkit.internalState}
          runtimeStateManager={toolkit.runtimeStateManager}
          searchSessionManager={toolkit.searchSessionManager}
        />
      </DiscoverToolkitTestProvider>
    );

    expect(await screen.findByTestId('discoverMissingDataViewPrompt')).toBeInTheDocument();
    expect(toolkit.internalState.getState().initializationState.hasDataView).toBe(false);

    await userEvent.click(screen.getByTestId('discoverMissingDataViewPicker'));
    await userEvent.click(await screen.findByTestId('dataview-create-new'));
    // The data view saved from the editor now exists
    persistedDataViews.push(dataViewWithTimefieldMock);
    const [{ onSave }] = jest.mocked(services.dataViewEditor.openEditor).mock.calls[0];
    onSave(dataViewWithTimefieldMock);

    expect(await screen.findByTestId('discoverMainApp')).toBeInTheDocument();
    expect(
      selectTab(toolkit.internalState.getState(), persistedTab.id).initializationState
    ).toEqual({ initializationStatus: TabInitializationStatus.Complete });
    expect(
      getTabDataView(selectTabRuntimeState(toolkit.runtimeStateManager, persistedTab.id))
    ).toBe(dataViewWithTimefieldMock);
  });
});
