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
import { mockTopNavMenu } from './__mocks__/top_nav_menu';
import { ContextAppContent } from './context_app_content';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { ContextApp, type ContextAppProps } from './context_app';
import { act } from 'react-dom/test-utils';
import { uiSettingsMock } from '../../__mocks__/ui_settings';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import type { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';

const mockNavigationPlugin = {
  ui: { TopNavMenu: mockTopNavMenu, AggregateQueryTopNavMenu: mockTopNavMenu },
} as unknown as NavigationPublicStart;
const services = createDiscoverServicesMock();

services.navigation = mockNavigationPlugin;
services.uiSettings = uiSettingsMock;

describe('ContextApp test', () => {
  const addFilterMock = jest.fn();
  const defaultProps: ContextAppProps = {
    dataView: dataViewMock,
    anchorId: 'mocked_anchor_id',
    addFilter: addFilterMock,
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
      <DiscoverTestProvider services={services}>
        <ContextApp {...defaultProps} />
      </DiscoverTestProvider>
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

  it('should call addFilter', async () => {
    const component = mountComponent();

    await act(async () => {
      component.find(ContextAppContent).invoke('addFilter')(
        'message',
        '2021-06-08T07:52:19.000Z',
        '+'
      );
    });

    expect(addFilterMock).toHaveBeenCalledTimes(1);
    expect(addFilterMock).toHaveBeenCalledWith('message', '2021-06-08T07:52:19.000Z', '+');
  });
});
