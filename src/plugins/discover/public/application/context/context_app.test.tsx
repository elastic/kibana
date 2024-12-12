/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';
import { mockTopNavMenu } from './__mocks__/top_nav_menu';
import { ContextAppContent } from './context_app_content';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ContextApp } from './context_app';
import { DiscoverServices } from '../../build_services';
import { dataViewsMock } from '../../__mocks__/data_views';
import { act } from 'react-dom/test-utils';
import { uiSettingsMock } from '../../__mocks__/ui_settings';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { LocalStorageMock } from '../../__mocks__/local_storage_mock';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { HistoryLocationState } from '../../build_services';
import { createSearchSessionMock } from '../../__mocks__/search_session';
import { createDiscoverServicesMock } from '../../__mocks__/services';

const mockFilterManager = createFilterManagerMock();
const mockNavigationPlugin = {
  ui: { TopNavMenu: mockTopNavMenu, AggregateQueryTopNavMenu: mockTopNavMenu },
};
const discoverServices = createDiscoverServicesMock();

describe('ContextApp test', () => {
  const { history } = createSearchSessionMock();
  const services = {
    data: discoverServices.data,
    capabilities: {
      discover: {
        save: true,
      },
      indexPatterns: {
        save: true,
      },
    },
    dataViews: dataViewsMock,
    toastNotifications: { addDanger: () => {} },
    navigation: mockNavigationPlugin,
    core: {
      ...discoverServices.core,
      executionContext: {
        set: jest.fn(),
      },
      notifications: { toasts: [] },
      theme: { theme$: themeServiceMock.createStartContract().theme$ },
    },
    history,
    fieldFormats: {
      getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
      getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    },
    filterManager: mockFilterManager,
    uiSettings: uiSettingsMock,
    storage: new LocalStorageMock({}),
    chrome: { setBreadcrumbs: jest.fn() },
    locator: {
      useUrl: jest.fn(() => ''),
      navigate: jest.fn(),
      getUrl: jest.fn(() => Promise.resolve('mock-url')),
    },
    contextLocator: { getRedirectUrl: jest.fn(() => '') },
    singleDocLocator: { getRedirectUrl: jest.fn(() => '') },
    profilesManager: discoverServices.profilesManager,
    ebtManager: discoverServices.ebtManager,
    timefilter: discoverServices.timefilter,
    uiActions: discoverServices.uiActions,
  } as unknown as DiscoverServices;

  const defaultProps = {
    dataView: dataViewMock,
    anchorId: 'mocked_anchor_id',
    locationState: {} as HistoryLocationState,
  };

  const topNavProps = {
    appName: 'context',
    showSearchBar: true,
    showQueryInput: false,
    showFilterBar: true,
    showDatePicker: false,
    indexPatterns: [dataViewMock],
    useDefaultBehaviors: true,
  };

  const mountComponent = () => {
    return mountWithIntl(
      <KibanaContextProvider services={services}>
        <ContextApp {...defaultProps} />
      </KibanaContextProvider>
    );
  };

  it('renders correctly', async () => {
    const component = mountComponent();
    await waitFor(() => {
      expect(component.find(ContextAppContent).length).toBe(1);
      const topNavMenu = component.find(mockTopNavMenu);
      expect(topNavMenu.length).toBe(1);
      expect(topNavMenu.props()).toStrictEqual(topNavProps);
    });
  });

  it('should set filters correctly', async () => {
    const component = mountComponent();

    await act(async () => {
      component.find(ContextAppContent).invoke('addFilter')(
        'message',
        '2021-06-08T07:52:19.000Z',
        '+'
      );
    });

    expect(mockFilterManager.addFilters.mock.calls.length).toBe(1);
    expect(mockFilterManager.addFilters.mock.calls[0][0]).toEqual([
      {
        $state: { store: 'appState' },
        meta: { alias: null, disabled: false, index: 'the-data-view-id', negate: false },
        query: { match_phrase: { message: '2021-06-08T07:52:19.000Z' } },
      },
    ]);
    expect(dataViewsMock.updateSavedObject.mock.calls.length).toBe(1);
    expect(dataViewsMock.updateSavedObject.mock.calls[0]).toEqual([dataViewMock, 0, true]);
  });
});
