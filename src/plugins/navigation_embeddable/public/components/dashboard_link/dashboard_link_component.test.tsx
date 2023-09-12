/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import userEvent from '@testing-library/user-event';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import {
  NavigationEmbeddable,
  NavigationEmbeddableContext,
} from '../../embeddable/navigation_embeddable';
import { mockNavigationEmbeddable } from '../../../common/mocks';
import { NAV_VERTICAL_LAYOUT } from '../../../common/content_management';
import { DashboardLinkComponent } from './dashboard_link_component';
import { fetchDashboard, getDashboardHref, getDashboardLocator } from './dashboard_link_tools';
import { coreServices } from '../../services/kibana_services';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';

jest.mock('./dashboard_link_tools');

describe('Dashboard link component', () => {
  const mockDashboards = [
    {
      id: 'foo',
      status: 'success',
      attributes: {
        title: 'my dashboard',
        description: 'something awesome',
        panelsJSON: [],
        timeRestore: false,
        version: 1,
      },
    },
  ];

  const defaultLinkInfo = {
    destination: 'foo',
    order: 1,
    id: '123',
    type: 'dashboardLink' as const,
  };

  let navEmbeddable: NavigationEmbeddable;
  beforeEach(async () => {
    (fetchDashboard as jest.Mock).mockResolvedValue(mockDashboards[0]);
    (getDashboardLocator as jest.Mock).mockResolvedValue({
      app: 'dashboard',
      path: '/dashboardItem/123',
      state: {},
    });
    (getDashboardHref as jest.Mock).mockReturnValue('https://my-kibana.com/dashboard/123');
    navEmbeddable = await mockNavigationEmbeddable();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigateToApp to open in same tab', async () => {
    render(
      <NavigationEmbeddableContext.Provider value={navEmbeddable}>
        <DashboardLinkComponent link={defaultLinkInfo} layout={NAV_VERTICAL_LAYOUT} />
      </NavigationEmbeddableContext.Provider>
    );

    expect(fetchDashboard).toHaveBeenCalledTimes(1);
    expect(fetchDashboard).toHaveBeenCalledWith(defaultLinkInfo.destination);
    expect(getDashboardLocator).toHaveBeenCalledTimes(1);
    expect(getDashboardLocator).toHaveBeenCalledWith({
      link: {
        ...defaultLinkInfo,
        options: DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      },
      navEmbeddable,
    });

    expect(screen.getByTestId('dashboardLink--123--loading')).toBeInTheDocument();
    const link = await screen.findByTestId('dashboardLink--123');
    expect(link).toBeInTheDocument();
    await userEvent.click(link);
    expect(coreServices.application.navigateToApp).toBeCalledTimes(1);
    expect(coreServices.application.navigateToApp).toBeCalledWith('dashboard', {
      path: '/dashboardItem/123',
      state: {},
    });
  });

  test('modified click does not trigger event.preventDefault', async () => {
    render(
      <NavigationEmbeddableContext.Provider value={navEmbeddable}>
        <DashboardLinkComponent link={defaultLinkInfo} layout={NAV_VERTICAL_LAYOUT} />
      </NavigationEmbeddableContext.Provider>
    );
    const link = await screen.findByTestId('dashboardLink--123');
    expect(link).toBeInTheDocument();
    const clickEvent = createEvent.click(link, { ctrlKey: true });
    const preventDefault = jest.spyOn(clickEvent, 'preventDefault');
    fireEvent(link, clickEvent);
    expect(preventDefault).toHaveBeenCalledTimes(0);
  });

  test('openInNewTab uses window.open, not navigateToApp', async () => {
    window.open = jest.fn();
    const linkInfo = {
      ...defaultLinkInfo,
      options: { ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS, openInNewTab: true },
    };
    render(
      <NavigationEmbeddableContext.Provider value={navEmbeddable}>
        <DashboardLinkComponent link={linkInfo} layout={NAV_VERTICAL_LAYOUT} />
      </NavigationEmbeddableContext.Provider>
    );

    expect(fetchDashboard).toHaveBeenCalledWith(linkInfo.destination);
    expect(getDashboardLocator).toHaveBeenCalledWith({ link: linkInfo, navEmbeddable });
    const link = await screen.findByTestId('dashboardLink--123');
    expect(link).toBeInTheDocument();
    await userEvent.click(link);
    expect(coreServices.application.navigateToApp).toBeCalledTimes(0);
    expect(window.open).toHaveBeenCalledWith('https://my-kibana.com/dashboard/123', '_blank');
    (window.open as jest.Mock).mockRestore();
  });

  test('linkOptions passed to getDashboardLocator', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
        useCurrentFilters: false,
        useCurrentTimeRange: false,
        useCurrentDateRange: false,
      },
    };
    render(
      <NavigationEmbeddableContext.Provider value={navEmbeddable}>
        <DashboardLinkComponent link={linkInfo} layout={NAV_VERTICAL_LAYOUT} />
      </NavigationEmbeddableContext.Provider>
    );
    expect(getDashboardLocator).toHaveBeenCalledWith({ link: linkInfo, navEmbeddable });
  });
});
