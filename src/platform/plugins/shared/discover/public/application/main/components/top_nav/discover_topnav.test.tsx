/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactElement } from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DiscoverTopNav, DiscoverTopNavProps } from './discover_topnav';
import { TopNavMenu, TopNavMenuData } from '@kbn/navigation-plugin/public';
import { discoverServiceMock as mockDiscoverService } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../../state_management/discover_state_provider';
import type { SearchBarCustomization, TopNavCustomization } from '../../../../customizations';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import { useDiscoverCustomization } from '../../../../customizations';
import { useKibana } from '@kbn/kibana-react-plugin/public';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
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

const mockSearchBarCustomizationWithHiddenDataViewPicker: SearchBarCustomization = {
  id: 'search_bar',
  hideDataViewPicker: true,
};

let mockUseCustomizations = false;

jest.mock('../../../../customizations', () => ({
  ...jest.requireActual('../../../../customizations'),
  useDiscoverCustomization: jest.fn(),
}));

const mockDefaultCapabilities = {
  discover_v2: { save: true },
} as unknown as typeof mockDiscoverService.capabilities;

function getProps(
  {
    capabilities,
  }: {
    capabilities?: Partial<typeof mockDiscoverService.capabilities>;
  } = { capabilities: mockDefaultCapabilities }
): DiscoverTopNavProps {
  if (capabilities) {
    mockDiscoverService.capabilities = capabilities as typeof mockDiscoverService.capabilities;
  }
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.transitions.setDataView(dataViewMock);

  return {
    stateContainer,
    savedQuery: '',
    onFieldEdited: jest.fn(),
  };
}

const mockUseKibana = useKibana as jest.Mock;

describe('Discover topnav component', () => {
  beforeEach(() => {
    mockTopNavCustomization.defaultMenu = undefined;
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

    mockUseKibana.mockReturnValue({
      services: mockDiscoverService,
    });
  });

  test('generated config of TopNavMenu config is correct when discover save permissions are assigned', () => {
    const props = getProps({ capabilities: { discover_v2: { save: true } } });
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu);
    const topMenuConfig = topNavMenu.props().config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['inspect', 'new', 'open', 'share', 'save']);
  });

  test('generated config of TopNavMenu config is correct when no discover save permissions are assigned', () => {
    const props = getProps({ capabilities: { discover_v2: { save: false } } });
    const component = mountWithIntl(
      <DiscoverMainProvider value={props.stateContainer}>
        <DiscoverTopNav {...props} />
      </DiscoverMainProvider>
    );
    const topNavMenu = component.find(TopNavMenu).props();
    const topMenuConfig = topNavMenu.config?.map((obj: TopNavMenuData) => obj.id);
    expect(topMenuConfig).toEqual(['inspect', 'new', 'open', 'share']);
  });

  describe('top nav customization', () => {
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

    it('should not render the dataView picker when hideDataViewPicker is true', () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithHiddenDataViewPicker;
        }
      });

      const props = getProps();
      const component = mountWithIntl(
        <DiscoverMainProvider value={props.stateContainer}>
          <DiscoverTopNav {...props} />
        </DiscoverMainProvider>
      );

      const topNav = component.find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu);
      expect(topNav.prop('dataViewPickerComponentProps')).toBeUndefined();
    });
  });
});
