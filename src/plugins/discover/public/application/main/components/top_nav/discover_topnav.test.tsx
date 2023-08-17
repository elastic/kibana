/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu, TopNavMenuData } from '@kbn/navigation-plugin/public';
import { Query } from '@kbn/es-query';
import { setHeaderActionMenuMounter } from '../../../../kibana_services';
import { discoverServiceMock as mockDiscoverService } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../services/discover_state_provider';
import type { SearchBarCustomization, TopNavCustomization } from '../../../../customizations';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import { useDiscoverCustomization } from '../../../../customizations';

setHeaderActionMenuMounter(jest.fn());

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: () => ({
    services: mockDiscoverService,
  }),
}));

const MockCustomSearchBar: typeof mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu =
  () => <div data-test-subj="custom-search-bar" />;

const mockTopNavCustomization: TopNavCustomization = {
  id: 'top_nav',
};

const mockSearchBarCustomization: SearchBarCustomization = {
  id: 'search_bar',
  CustomDataViewPicker: jest.fn(() => <div data-test-subj="custom-data-view-picker" />),
};

const mockSearchBarCustomizationWithCustomSearchBar: SearchBarCustomization = {
  id: 'search_bar',
  CustomSearchBar: MockCustomSearchBar,
};

let mockUseCustomizations = false;

jest.mock('../../../../customizations', () => ({
  ...jest.requireActual('../../../../customizations'),
  useDiscoverCustomization: jest.fn(),
}));

function getProps(savePermissions = true): DiscoverTopNavProps {
  mockDiscoverService.capabilities.discover!.save = savePermissions;
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.transitions.setDataView(dataViewMock);

  return {
    stateContainer,
    query: {} as Query,
    savedQuery: '',
    updateQuery: jest.fn(),
    onOpenInspector: jest.fn(),
    onFieldEdited: jest.fn(),
    isPlainRecord: false,
  };
}

describe('Discover topnav component', () => {
  beforeEach(() => {
    mockTopNavCustomization.defaultMenu = undefined;
    mockTopNavCustomization.getMenuItems = undefined;
    mockUseCustomizations = false;
    jest.clearAllMocks();

    (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
      if (!mockUseCustomizations) {
        return undefined;
      }

      switch (id) {
        case 'top_nav':
          return mockTopNavCustomization;
        case 'search_bar':
          return mockSearchBarCustomization;
        default:
          throw new Error(`Unknown customization id: ${id}`);
      }
    });
  });

  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps(true);
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu);
    const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['new', 'open', 'share', 'inspect', 'save']);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps(false);
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu).props();
    const topMenuConfig = topNavMenu.config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['new', 'open', 'share', 'inspect']);
  });

  describe('top nav customization', () => {
    it('should call getMenuItems', () => {
      mockUseCustomizations = true;
      mockTopNavCustomization.getMenuItems = jest.fn(() => [
        {
          data: {
            id: 'test',
            label: 'Test',
            testId: 'testButton',
            run: () => {},
          },
          order: 350,
        },
      ]);
      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      expect(mockTopNavCustomization.getMenuItems).toHaveBeenCalledTimes(1);
      const topNavMenu = component.find(TopNavMenu);
      const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
      expect(topMenuConfig).toEqual(['new', 'open', 'share', 'test', 'inspect', 'save']);
    });

    it('should allow disabling default menu items', () => {
      mockUseCustomizations = true;
      mockTopNavCustomization.defaultMenu = {
        newItem: { disabled: true },
        openItem: { disabled: true },
        shareItem: { disabled: true },
        alertsItem: { disabled: true },
        inspectItem: { disabled: true },
        saveItem: { disabled: true },
      };
      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      const topNavMenu = component.find(TopNavMenu);
      const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
      expect(topMenuConfig).toEqual([]);
    });

    it('should allow reordering default menu items', () => {
      mockUseCustomizations = true;
      mockTopNavCustomization.defaultMenu = {
        newItem: { order: 6 },
        openItem: { order: 5 },
        shareItem: { order: 4 },
        alertsItem: { order: 3 },
        inspectItem: { order: 2 },
        saveItem: { order: 1 },
      };
      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      const topNavMenu = component.find(TopNavMenu);
      const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
      expect(topMenuConfig).toEqual(['save', 'inspect', 'share', 'open', 'new']);
    });
  });

  describe('search bar customization', () => {
    it('should render custom Search Bar', () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithCustomSearchBar;
        }
      });

      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );

      expect(component.find({ 'data-test-subj': 'custom-search-bar' })).toHaveLength(1);
    });

    it('should render CustomDataViewPicker', () => {
      mockUseCustomizations = true;
      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );
      const topNav = component.find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu);
      expect(topNav.prop('dataViewPickerComponentProps')).toBeUndefined();
      const dataViewPickerOverride = mountWithIntl(
        topNav.prop('dataViewPickerOverride') as ReactElement
      ).find(mockSearchBarCustomization.CustomDataViewPicker!);
      expect(dataViewPickerOverride.length).toBe(1);
    });
  });
});
