/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../../__mocks__/discover_state.mock';
import { internalStateActions, type TabState } from '../../../state_management/redux';
import { getTabStateMock } from '../../../state_management/redux/__mocks__/internal_state.mocks';
import { buildDiscoverSessionExportRequest } from './build_discover_session_export_request';

describe('buildDiscoverSessionExportRequest', () => {
  it('builds a stored session draft from an unsaved session', async () => {
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
        appState: { interval: 'auto' },
      })
    );

    const result = buildDiscoverSessionExportRequest({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'Untitled Discover session',
    });

    expect(result.attributes).toEqual(
      expect.objectContaining({
        title: 'Untitled Discover session',
        description: '',
        tabs: [
          expect.objectContaining({
            id: toolkit.getCurrentTab().id,
            label: toolkit.getCurrentTab().label,
            attributes: expect.objectContaining({
              hideChart: expect.any(Boolean),
              hideTable: false,
              timeRestore: false,
              chartInterval: 'auto',
              kibanaSavedObjectMeta: {
                searchSourceJSON: expect.any(String),
              },
            }),
          }),
        ],
      })
    );
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('meta');
  });

  it('includes the current control state for server sanitization', async () => {
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
        attributes: {
          controlGroupState: {
            panel1: {
              type: 'esqlControl',
              order: 0,
              width: 'medium',
              grow: false,
              controlType: 'STATIC_VALUES',
              variableName: 'foo',
              variableType: 'values',
              availableOptions: ['bar', 'baz'],
              selectedOptions: ['bar'],
              singleSelect: true,
            },
          } as unknown as TabState['attributes']['controlGroupState'],
        },
      })
    );

    const result = buildDiscoverSessionExportRequest({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'Session with controls',
    });

    expect(JSON.parse(result.attributes.tabs[0].attributes.controlGroupJson ?? '{}')).toEqual({
      panel1: expect.objectContaining({
        type: 'esqlControl',
        variableName: 'foo',
        selectedOptions: ['bar'],
      }),
    });
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

    const secondTab = getTabStateMock({ id: 'second-tab', label: 'Second tab' });
    await toolkit.addNewTab({ tab: secondTab });
    await toolkit.initializeSingleTab({ tabId: secondTab.id });

    const result = buildDiscoverSessionExportRequest({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      title: 'All tabs session',
    });
    const selectedTabResult = buildDiscoverSessionExportRequest({
      getState: toolkit.internalState.getState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      tabId: secondTab.id,
      title: 'Single tab session',
    });

    expect(result.attributes.tabs.map(({ id }) => id)).toEqual([initialTabId, secondTab.id]);
    expect(selectedTabResult.attributes.tabs).toEqual([
      expect.objectContaining({ id: secondTab.id, label: secondTab.label }),
    ]);
  });
});
