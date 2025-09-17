/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import { setMockedPresentationUtilServices } from '@kbn/presentation-util-plugin/public/mocks';
import { render } from '@testing-library/react';

import type { DashboardApi } from '../dashboard_api/types';
import { DashboardContext } from '../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi } from '../mocks';
import { dataService, navigationService, shareService } from '../services/kibana_services';
import { InternalDashboardTopNav } from './internal_dashboard_top_nav';

jest.mock('../dashboard_app/top_nav/dashboard_editing_toolbar', () => ({
  DashboardEditingToolbar: () => {
    return <div>mockDashboardEditingToolbar</div>;
  },
}));

const renderWithDashboardContext = (
  component: React.ReactElement,
  overrides?: { dashboardApi?: DashboardApi }
) => {
  const { api: dashboardApi, internalApi: dashboardInternalApi } = buildMockDashboardApi();
  const finalDashboardApi = overrides?.dashboardApi || dashboardApi;

  return render(
    <DashboardInternalContext.Provider value={dashboardInternalApi}>
      <DashboardContext.Provider value={finalDashboardApi}>{component}</DashboardContext.Provider>
    </DashboardInternalContext.Provider>
  );
};

describe('Internal dashboard top nav', () => {
  const mockTopNav = (badges: TopNavMenuProps['badges'] | undefined[]) => {
    if (badges) {
      return badges?.map((badge, index) => (
        <div key={index} className="badge">
          {badge?.badgeText}
        </div>
      ));
    } else {
      return <></>;
    }
  };

  beforeEach(() => {
    setMockedPresentationUtilServices();
    dataService.query.filterManager.getFilters = jest.fn().mockReturnValue([]);
    // topNavMenu is mocked as a jest.fn() so we want to mock it with a component
    // @ts-ignore type issue with the mockTopNav for this test suite
    navigationService.ui.TopNavMenu = jest.fn(({ badges }: TopNavMenuProps) => mockTopNav(badges));
    shareService!.availableIntegrations = jest.fn().mockReturnValue([]);
  });

  it('should not render the managed badge by default', async () => {
    const component = renderWithDashboardContext(
      <InternalDashboardTopNav redirectTo={jest.fn()} />
    );

    expect(component.queryByText('Managed')).toBeNull();
  });

  it('should render the managed badge when the dashboard is managed', async () => {
    const { api } = buildMockDashboardApi();
    const dashboardApi = {
      ...api,
      isManaged: true,
    };
    const component = renderWithDashboardContext(
      <InternalDashboardTopNav redirectTo={jest.fn()} />,
      { dashboardApi }
    );

    expect(component.getByText('Managed')).toBeDefined();
  });

  describe('embed mode', () => {
    it('should hide all top nav and unified search elements except filter bar by default', async () => {
      const { api } = buildMockDashboardApi();
      const dashboardApi: DashboardApi = {
        ...api,
        viewMode$: new BehaviorSubject<ViewMode>('view'),
      };

      renderWithDashboardContext(
        <InternalDashboardTopNav
          redirectTo={jest.fn()}
          embedSettings={{
            forceShowDatePicker: false,
            forceHideFilterBar: false,
            forceShowQueryInput: false,
            forceShowTopNavMenu: false,
          }}
        />,
        { dashboardApi }
      );

      expect(navigationService.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          showDatePicker: false,
          showFilterBar: true,
          showQueryInput: false,
          showSearchBar: true,
          showTopNavMenu: false,
        }),
        {}
      );
    });
  });

  it('should disable filter bar when forceHideFilterBar is true', async () => {
    const { api } = buildMockDashboardApi();
    const dashboardApi: DashboardApi = {
      ...api,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };

    renderWithDashboardContext(
      <InternalDashboardTopNav
        redirectTo={jest.fn()}
        embedSettings={{
          forceHideFilterBar: true,
          forceShowDatePicker: false,
          forceShowQueryInput: false,
          forceShowTopNavMenu: false,
        }}
      />,
      { dashboardApi }
    );

    expect(navigationService.ui.TopNavMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        showDatePicker: false,
        showFilterBar: false,
        showQueryInput: false,
        showSearchBar: false,
        showTopNavMenu: false,
      }),
      {}
    );
  });

  it('should enable global time range date picker when forceShowDatePicker is true', async () => {
    const { api } = buildMockDashboardApi();
    const dashboardApi: DashboardApi = {
      ...api,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };

    renderWithDashboardContext(
      <InternalDashboardTopNav
        redirectTo={jest.fn()}
        embedSettings={{
          forceShowDatePicker: true,
          forceHideFilterBar: false,
          forceShowQueryInput: false,
          forceShowTopNavMenu: false,
        }}
      />,
      { dashboardApi }
    );

    expect(navigationService.ui.TopNavMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        showDatePicker: true,
        showFilterBar: true,
        showQueryInput: false,
        showSearchBar: true,
        showTopNavMenu: false,
      }),
      {}
    );
  });

  it('should enable query search bar when forceShowQueryInput is true', async () => {
    const { api } = buildMockDashboardApi();
    const dashboardApi: DashboardApi = {
      ...api,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };

    renderWithDashboardContext(
      <InternalDashboardTopNav
        redirectTo={jest.fn()}
        embedSettings={{
          forceShowDatePicker: false,
          forceHideFilterBar: false,
          forceShowQueryInput: true,
          forceShowTopNavMenu: false,
        }}
      />,
      { dashboardApi }
    );

    expect(navigationService.ui.TopNavMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        showDatePicker: false,
        showFilterBar: true,
        showQueryInput: true,
        showSearchBar: true,
        showTopNavMenu: false,
      }),
      {}
    );
  });

  it('should enable top nav when forceShowTopNavMenu is true', async () => {
    const { api } = buildMockDashboardApi();
    const dashboardApi: DashboardApi = {
      ...api,
      viewMode$: new BehaviorSubject<ViewMode>('view'),
    };

    renderWithDashboardContext(
      <InternalDashboardTopNav
        redirectTo={jest.fn()}
        embedSettings={{
          forceShowDatePicker: false,
          forceShowTopNavMenu: true,
          forceShowQueryInput: false,
          forceHideFilterBar: false,
        }}
      />,
      { dashboardApi }
    );

    expect(navigationService.ui.TopNavMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        showDatePicker: false,
        showFilterBar: true,
        showQueryInput: false,
        showSearchBar: true,
        showTopNavMenu: true,
      }),
      {}
    );
  });
});
