/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { useContext } from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverTopNavProps } from './discover_topnav';
import { DiscoverTopNav } from './discover_topnav';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { discoverServiceMock as mockDiscoverService } from '../../../../__mocks__/services';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import type { SearchBarCustomization, TopNavCustomization } from '../../../../customizations';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import { useDiscoverCustomization } from '../../../../customizations';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverTestProvider } from '../../../../__mocks__/test_provider';
import { DiscoverTopNavMenuProvider, discoverTopNavMenuContext } from './discover_topnav_menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

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
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.setDataView)({ dataView: dataViewMock })
  );

  return {
    stateContainer,
    savedQuery: '',
    onFieldEdited: jest.fn(),
  };
}

// Helper component to capture the topNavMenu from context
let capturedTopNavMenu: AppMenuConfig | undefined;
const TopNavMenuCapture = () => {
  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);
  topNavMenu$.subscribe((menu) => {
    capturedTopNavMenu = menu;
  });
  return null;
};

const mockUseKibana = useKibana as jest.Mock;
const getTestComponent = (props: DiscoverTopNavProps) =>
  mountWithIntl(
    <DiscoverTestProvider
      services={mockDiscoverService}
      stateContainer={props.stateContainer}
      runtimeState={{ currentDataView: dataViewMock, adHocDataViews: [] }}
    >
      <DiscoverTopNavMenuProvider>
        <TopNavMenuCapture />
        <DiscoverTopNav {...props} />
      </DiscoverTopNavMenuProvider>
    </DiscoverTestProvider>
  );

describe('Discover topnav component', () => {
  beforeEach(() => {
    mockTopNavCustomization.defaultMenu = undefined;
    mockUseCustomizations = false;
    capturedTopNavMenu = undefined;
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

  test('generated config of AppMenuConfig is correct when discover save permissions are assigned', async () => {
    const props = getProps({ capabilities: { discover_v2: { save: true } } });
    await act(async () => {
      getTestComponent(props);
    });

    const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
    expect(itemIds).toEqual(['inspect', 'new', 'open']);
    expect(capturedTopNavMenu?.primaryActionItem?.id).toBe('save');
  });

  test('generated config of AppMenuConfig is correct when no discover save permissions are assigned', async () => {
    const props = getProps({ capabilities: { discover_v2: { save: false } } });
    await act(async () => {
      getTestComponent(props);
    });

    const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
    expect(itemIds).toEqual(['inspect', 'new', 'open']);
    expect(capturedTopNavMenu?.primaryActionItem).toBeUndefined();
  });

  describe('top nav customization', () => {
    it('should allow disabling default menu items', async () => {
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
      await act(async () => {
        getTestComponent(props);
      });

      const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
      expect(itemIds).toEqual([]);
    });

    describe('share service available', () => {
      let availableIntegrationsSpy: jest.SpyInstance;

      beforeAll(() => {
        mockDiscoverService.share = sharePluginMock.createStartContract();
      });

      afterAll(() => {
        mockDiscoverService.share = undefined;
      });

      beforeEach(() => {
        (availableIntegrationsSpy = jest.spyOn(
          mockDiscoverService.share!,
          'availableIntegrations'
        )).mockImplementation(() => []);
      });

      it('will include share menu item if the share service is available', async () => {
        const props = getProps();
        await act(async () => {
          getTestComponent(props);
        });

        const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
        expect(itemIds).toEqual(['inspect', 'new', 'open', 'share']);
        expect(capturedTopNavMenu?.primaryActionItem?.id).toBe('save');
      });

      it('will include export menu item if there are export integrations available', async () => {
        availableIntegrationsSpy.mockImplementation((_objectType, groupId) => {
          if (groupId === 'export') {
            return [
              {
                id: 'export',
                shareType: 'integration',
                groupId: 'export',
                config: () => Promise.resolve({}),
              },
            ];
          }

          return [];
        });

        const props = getProps();
        await act(async () => {
          getTestComponent(props);
        });

        const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
        expect(itemIds).toEqual(['inspect', 'new', 'open', 'export', 'share']);
        expect(capturedTopNavMenu?.primaryActionItem?.id).toBe('save');
      });
    });
  });

  describe('search bar customization', () => {
    it('should render custom Search Bar', async () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithCustomSearchBar;
        }
      });

      const props = getProps();
      let component: ReturnType<typeof mountWithIntl>;
      await act(async () => {
        component = getTestComponent(props);
      });

      expect(component!.find({ 'data-test-subj': 'custom-search-bar' })).toHaveLength(1);
    });

    it('should render CustomDataViewPicker', async () => {
      mockUseCustomizations = true;
      const props = getProps();
      let component: ReturnType<typeof mountWithIntl>;
      await act(async () => {
        component = getTestComponent(props);
      });

      const topNav = component!
        .find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu)
        .at(0);
      expect(topNav.prop('dataViewPickerComponentProps')).toBeUndefined();
      const dataViewPickerOverride = mountWithIntl(
        topNav.prop('dataViewPickerOverride') as ReactElement
      ).find(mockSearchBarCustomization.CustomDataViewPicker!);
      expect(dataViewPickerOverride.length).toBe(1);
    });

    it('should not render the dataView picker when hideDataViewPicker is true', async () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithHiddenDataViewPicker;
        }
      });

      const props = getProps();
      let component: ReturnType<typeof mountWithIntl>;
      await act(async () => {
        component = getTestComponent(props);
      });

      const topNav = component!
        .find(mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu)
        .at(0);
      expect(topNav.prop('dataViewPickerComponentProps')).toBeUndefined();
    });
  });
});
