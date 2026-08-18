/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useContext, useEffect } from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DiscoverTopNavProps } from './discover_topnav';
import { DiscoverTopNav } from './discover_topnav';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import {
  getDiscoverInternalStateMock,
  type InternalStateMockToolkit,
} from '../../../../__mocks__/discover_state.mock';
import type { SearchBarCustomization } from '../../../../customizations';
import type { DiscoverCustomizationId } from '../../../../customizations/customization_service';
import { useDiscoverCustomization } from '../../../../customizations';
import { internalStateActions } from '../../state_management/redux';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { DiscoverTopNavMenuProvider, discoverTopNavMenuContext } from './discover_topnav_menu';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

let mockDiscoverService = createDiscoverServicesMock();
type AggregateQueryTopNavMenuProps = ComponentProps<
  typeof mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu
>;

const MockAggregateQueryTopNavMenu = ({
  dataViewPickerComponentProps,
  dataViewPickerOverride,
  isDisabled,
}: AggregateQueryTopNavMenuProps) => (
  <div
    data-test-subj="aggregate-query-top-nav-menu"
    data-has-data-view-picker-component-props={String(Boolean(dataViewPickerComponentProps))}
    data-has-data-view-picker-override={String(Boolean(dataViewPickerOverride))}
    data-is-disabled={String(Boolean(isDisabled))}
  >
    {dataViewPickerOverride}
  </div>
);

const MockCustomSearchBar: typeof mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu =
  () => <div data-test-subj="custom-search-bar" />;

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

async function setup(
  {
    capabilities,
    hasDataView = true,
  }: {
    capabilities?: Partial<typeof mockDiscoverService.capabilities>;
    hasDataView?: boolean;
  } = { capabilities: mockDefaultCapabilities }
) {
  mockDiscoverService = createDiscoverServicesMock();
  if (capabilities) {
    mockDiscoverService.capabilities = capabilities as typeof mockDiscoverService.capabilities;
  }
  mockDiscoverService.navigation.ui.AggregateQueryTopNavMenu = MockAggregateQueryTopNavMenu;

  if (!hasDataView) {
    // Simulate a space without any data view
    mockDiscoverService.dataViews.getDefaultDataView = jest.fn(() => Promise.resolve(null));
  }

  const toolkit = getDiscoverInternalStateMock({
    services: mockDiscoverService,
    persistedDataViews: hasDataView ? [dataViewMock] : [],
  });

  await toolkit.initializeTabs();
  await toolkit.initializeSingleTab({ tabId: toolkit.getCurrentTab().id });

  if (hasDataView) {
    toolkit.internalState.dispatch(
      internalStateActions.setDataView({
        tabId: toolkit.getCurrentTab().id,
        dataView: dataViewMock,
      })
    );
  }

  const props: DiscoverTopNavProps = {
    savedQuery: '',
    onFieldEdited: jest.fn(),
  };

  return { toolkit, props };
}

// Helper component to capture the topNavMenu from context
let capturedTopNavMenu: AppMenuConfig | undefined;
const TopNavMenuCapture = () => {
  const { topNavMenu$ } = useContext(discoverTopNavMenuContext);

  useEffect(() => {
    const subscription = topNavMenu$.subscribe((menu) => {
      capturedTopNavMenu = menu;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [topNavMenu$]);

  return null;
};

const renderTestComponent = ({
  toolkit,
  props,
}: {
  toolkit: InternalStateMockToolkit;
  props: DiscoverTopNavProps;
}) =>
  renderWithKibanaRenderContext(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <DiscoverTopNavMenuProvider customizationContext={toolkit.customizationContext}>
        <TopNavMenuCapture />
        <DiscoverTopNav {...props} />
      </DiscoverTopNavMenuProvider>
    </DiscoverToolkitTestProvider>
  );

describe('Discover topnav component', () => {
  beforeEach(() => {
    mockUseCustomizations = false;
    capturedTopNavMenu = undefined;
    jest.clearAllMocks();

    (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
      if (!mockUseCustomizations) {
        return undefined;
      }

      switch (id) {
        case 'search_bar':
          return mockSearchBarCustomization;
        default:
          throw new Error(`Unknown customization id: ${id}`);
      }
    });
  });

  test('generated config of AppMenuConfig is correct when discover save permissions are assigned', async () => {
    const { toolkit, props } = await setup({ capabilities: { discover_v2: { save: true } } });
    renderTestComponent({ toolkit, props });

    await waitFor(() => {
      expect(capturedTopNavMenu).toBeDefined();
    });

    const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
    expect(itemIds).toEqual(['new', 'open', 'inspect']);
    expect(capturedTopNavMenu?.primaryActionItem?.id).toBe('save');
  });

  test('generated config of AppMenuConfig is correct when no discover save permissions are assigned', async () => {
    const { toolkit, props } = await setup({ capabilities: { discover_v2: { save: false } } });
    renderTestComponent({ toolkit, props });

    await waitFor(() => {
      expect(capturedTopNavMenu).toBeDefined();
    });

    const itemIds = capturedTopNavMenu?.items?.map((item) => item.id) || [];
    expect(itemIds).toEqual(['new', 'open', 'inspect']);
    expect(capturedTopNavMenu?.primaryActionItem).toBeUndefined();
  });

  describe('data view picker', () => {
    it('should render the picker when a data view is available', async () => {
      const { toolkit, props } = await setup();
      renderTestComponent({ toolkit, props });

      const topNav = screen.getByTestId('aggregate-query-top-nav-menu');

      expect(topNav).toHaveAttribute('data-has-data-view-picker-component-props', 'true');
      expect(topNav).toHaveAttribute('data-has-data-view-picker-override', 'false');
      expect(topNav).toHaveAttribute('data-is-disabled', 'false');
      expect(screen.queryByTestId('discoverCreateDataViewButton')).not.toBeInTheDocument();
    });

    it('should offer creating a data view and disable the search bar when there is none to pick', async () => {
      const { toolkit, props } = await setup({ hasDataView: false });
      renderTestComponent({ toolkit, props });

      const createDataViewButton = await screen.findByTestId('discoverCreateDataViewButton');

      expect(screen.getByTestId('aggregate-query-top-nav-menu')).toHaveAttribute(
        'data-is-disabled',
        'true'
      );

      await userEvent.click(createDataViewButton);

      expect(mockDiscoverService.dataViewEditor.openEditor).toHaveBeenCalledWith(
        expect.objectContaining({ allowAdHocDataView: true })
      );
    });
  });

  describe('search bar customization', () => {
    it('should render custom Search Bar', async () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithCustomSearchBar;
        }
      });

      const { toolkit, props } = await setup();
      renderTestComponent({ toolkit, props });

      expect(screen.getByTestId('custom-search-bar')).toBeVisible();
      expect(screen.queryByTestId('aggregate-query-top-nav-menu')).not.toBeInTheDocument();
    });

    it('should render CustomDataViewPicker', async () => {
      mockUseCustomizations = true;
      const { toolkit, props } = await setup();
      renderTestComponent({ toolkit, props });

      const topNav = screen.getByTestId('aggregate-query-top-nav-menu');

      expect(topNav).toHaveAttribute('data-has-data-view-picker-component-props', 'false');
      expect(topNav).toHaveAttribute('data-has-data-view-picker-override', 'true');
      expect(screen.getByTestId('custom-data-view-picker')).toBeVisible();
    });

    it('should not render the dataView picker when hideDataViewPicker is true', async () => {
      (useDiscoverCustomization as jest.Mock).mockImplementation((id: DiscoverCustomizationId) => {
        if (id === 'search_bar') {
          return mockSearchBarCustomizationWithHiddenDataViewPicker;
        }
      });

      const { toolkit, props } = await setup();
      renderTestComponent({ toolkit, props });

      const topNav = screen.getByTestId('aggregate-query-top-nav-menu');

      expect(topNav).toHaveAttribute('data-has-data-view-picker-component-props', 'false');
      expect(topNav).toHaveAttribute('data-has-data-view-picker-override', 'false');
      expect(screen.queryByTestId('custom-data-view-picker')).not.toBeInTheDocument();
    });
  });
});
