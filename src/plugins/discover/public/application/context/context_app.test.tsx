/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { createFilterManagerMock } from '../../../../data/public/query/filter_manager/filter_manager.mock';
import { mockTopNavMenu } from './__mocks__/top_nav_menu';
import { ContextAppContent } from './context_app_content';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { ContextApp } from './context_app';
import { DiscoverServices } from '../../build_services';
import { indexPatternsMock } from '../../__mocks__/index_patterns';
import { act } from 'react-dom/test-utils';
import { uiSettingsMock } from '../../__mocks__/ui_settings';
import { themeServiceMock } from '../../../../../core/public/mocks';
import { LocalStorageMock } from '../../__mocks__/local_storage_mock';
import { KibanaContextProvider } from '../../../../kibana_react/public';

const mockFilterManager = createFilterManagerMock();
const mockNavigationPlugin = { ui: { TopNavMenu: mockTopNavMenu } };

describe('ContextApp test', () => {
  const services = {
    data: {
      search: {
        searchSource: {
          createEmpty: jest.fn(),
        },
      },
    },
    capabilities: {
      discover: {
        save: true,
      },
      indexPatterns: {
        save: true,
      },
    },
    indexPatterns: indexPatternsMock,
    toastNotifications: { addDanger: () => {} },
    navigation: mockNavigationPlugin,
    core: {
      executionContext: {
        set: jest.fn(),
      },
      notifications: { toasts: [] },
      theme: { theme$: themeServiceMock.createStartContract().theme$ },
    },
    history: () => {},
    fieldFormats: {
      getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => value })),
      getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
    },
    filterManager: mockFilterManager,
    uiSettings: uiSettingsMock,
    storage: new LocalStorageMock({}),
  } as unknown as DiscoverServices;

  const defaultProps = {
    indexPattern: indexPatternMock,
    anchorId: 'mocked_anchor_id',
  };

  const topNavProps = {
    appName: 'context',
    showSearchBar: true,
    showQueryBar: true,
    showQueryInput: false,
    showFilterBar: true,
    showSaveQuery: false,
    showDatePicker: false,
    indexPatterns: [indexPatternMock],
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
        meta: { alias: null, disabled: false, index: 'the-index-pattern-id', negate: false },
        query: { match_phrase: { message: '2021-06-08T07:52:19.000Z' } },
      },
    ]);
    expect(indexPatternsMock.updateSavedObject.mock.calls.length).toBe(1);
    expect(indexPatternsMock.updateSavedObject.mock.calls[0]).toEqual([indexPatternMock, 0, true]);
  });
});
