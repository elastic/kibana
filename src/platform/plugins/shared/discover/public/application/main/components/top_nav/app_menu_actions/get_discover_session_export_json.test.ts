/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { mockControlState } from '../../../../../__mocks__/esql_controls';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions } from '../../../state_management/redux';
import { getTabStateMock } from '../../../state_management/redux/__mocks__/internal_state.mocks';
import { getDiscoverSessionExportJson } from './get_discover_session_export_json';

describe('getDiscoverSessionExportJson', () => {
  it('builds a portable API body from an unsaved session', async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.setDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: dataViewMock,
      })
    );
    toolkit.internalState.dispatch(
      internalStateActions.updateAppState({
        tabId: toolkit.getCurrentTab().id,
        appState: { interval: '10m' },
      })
    );

    const { sessionState: result, warnings } = getDiscoverSessionExportJson({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'Untitled Discover session',
    });

    expect(result).toEqual(
      expect.objectContaining({
        title: 'Untitled Discover session',
        description: '',
        tabs: [
          expect.objectContaining({
            id: toolkit.getCurrentTab().id,
            label: toolkit.getCurrentTab().label,
            hide_chart: expect.any(Boolean),
            hide_table: false,
            time_restore: false,
            data_source: expect.any(Object),
          }),
        ],
      })
    );
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('meta');
    expect(result.tabs[0]).not.toHaveProperty('chart_interval');
    expect(warnings).toEqual([
      expect.objectContaining({
        type: 'dropped_property',
        tab_id: toolkit.getCurrentTab().id,
        key: 'chart_interval',
      }),
    ]);
  });

  it('includes the current control state', async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

    toolkit.internalState.dispatch(
      internalStateActions.updateAttributes({
        tabId: toolkit.getCurrentTab().id,
        attributes: { controlGroupState: mockControlState },
      })
    );

    const { sessionState: result } = getDiscoverSessionExportJson({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'Session with controls',
    });

    expect(result.tabs[0].control_panels).toEqual([
      {
        id: 'panel1',
        type: 'esql_control',
        width: 'medium',
        grow: false,
        config: expect.objectContaining({
          variable_name: 'foo',
          selected_options: ['bar'],
        }),
      },
    ]);
  });

  it('exports all tabs by default and can export only the selected tab', async () => {
    const services = createDiscoverServicesMock();
    const toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewMock],
    });

    await toolkit.initializeTabs();
    await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });
    const initialTabId = toolkit.getCurrentTab().id;

    const selectedTab = getTabStateMock({
      id: 'selected-tab',
      label: 'Selected tab',
    });
    await toolkit.addNewTab({ tab: selectedTab });
    await toolkit.initializeSingleTab({ tabId: selectedTab.id });

    const { sessionState: allTabsResult } = getDiscoverSessionExportJson({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'All tabs session',
    });
    const { sessionState: result } = getDiscoverSessionExportJson({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      tabId: selectedTab.id,
      title: 'Single tab session',
    });

    expect(allTabsResult.tabs.map(({ id }) => id)).toEqual([initialTabId, selectedTab.id]);
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0]).toEqual(
      expect.objectContaining({
        id: selectedTab.id,
        label: selectedTab.label,
      })
    );
  });
});
