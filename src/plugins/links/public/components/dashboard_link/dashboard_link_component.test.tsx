/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import userEvent from '@testing-library/user-event';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { LinksEmbeddable, LinksContext } from '../../embeddable/links_embeddable';
import { mockLinksPanel } from '../../../common/mocks';
import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { DashboardLinkComponent } from './dashboard_link_component';
import { fetchDashboard, getDashboardHref, getDashboardLocator } from './dashboard_link_tools';
import { coreServices } from '../../services/kibana_services';

jest.mock('./dashboard_link_tools');

describe('Dashboard link component', () => {
  const mockDashboards = [
    {
      id: '456',
      status: 'success',
      attributes: {
        title: 'another dashboard',
        description: 'something awesome',
        panelsJSON: [],
        timeRestore: false,
        version: '1',
      },
    },
    {
      id: '123',
      status: 'success',
      attributes: {
        title: 'current dashboard',
        description: '',
        panelsJSON: [],
        timeRestore: false,
        version: '1',
      },
    },
  ];

  const defaultLinkInfo = {
    destination: '456',
    order: 1,
    id: 'foo',
    type: 'dashboardLink' as const,
  };

  const onLoading = jest.fn();
  const onRender = jest.fn();

  let linksEmbeddable: LinksEmbeddable;
  beforeEach(async () => {
    window.open = jest.fn();
    (fetchDashboard as jest.Mock).mockResolvedValue(mockDashboards[0]);
    (getDashboardLocator as jest.Mock).mockResolvedValue({
      app: 'dashboard',
      path: '/dashboardItem/456',
      state: {},
    });
    (getDashboardHref as jest.Mock).mockReturnValue('https://my-kibana.com/dashboard/123');
    linksEmbeddable = await mockLinksPanel({
      dashboardExplicitInput: mockDashboards[1].attributes,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigateToApp to open in same tab', async () => {
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={defaultLinkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );

    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    expect(fetchDashboard).toHaveBeenCalledWith(defaultLinkInfo.destination);
    expect(getDashboardLocator).toHaveBeenCalledTimes(1);
    expect(getDashboardLocator).toHaveBeenCalledWith({
      link: {
        ...defaultLinkInfo,
        options: DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      },
      linksEmbeddable,
    });
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));

    const link = await screen.findByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent('another dashboard');
    await userEvent.click(link);
    expect(coreServices.application.navigateToApp).toBeCalledTimes(1);
    expect(coreServices.application.navigateToApp).toBeCalledWith('dashboard', {
      path: '/dashboardItem/456',
      state: {},
    });
  });

  test('modified click does not trigger event.preventDefault', async () => {
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={defaultLinkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--foo');
    const clickEvent = createEvent.click(link, { ctrlKey: true });
    const preventDefault = jest.spyOn(clickEvent, 'preventDefault');
    fireEvent(link, clickEvent);
    expect(preventDefault).toHaveBeenCalledTimes(0);
  });

  test('openInNewTab uses window.open, not navigateToApp', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: { ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS, openInNewTab: true },
    };
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={linkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    expect(fetchDashboard).toHaveBeenCalledWith(linkInfo.destination);
    expect(getDashboardLocator).toHaveBeenCalledWith({ link: linkInfo, linksEmbeddable });
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--foo');
    expect(link).toBeInTheDocument();
    await userEvent.click(link);
    expect(coreServices.application.navigateToApp).toBeCalledTimes(0);
    expect(window.open).toHaveBeenCalledWith('https://my-kibana.com/dashboard/123', '_blank');
  });

  test('passes linkOptions to getDashboardLocator', async () => {
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
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={linkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    expect(getDashboardLocator).toHaveBeenCalledWith({ link: linkInfo, linksEmbeddable });
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
  });

  test('shows an error when fetchDashboard fails', async () => {
    (fetchDashboard as jest.Mock).mockRejectedValue(new Error('some error'));
    const linkInfo = {
      ...defaultLinkInfo,
      id: 'notfound',
    };
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={linkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--notfound--error');
    expect(link).toHaveTextContent(DashboardLinkStrings.getDashboardErrorLabel());
  });

  test('current dashboard is not a clickable href', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      destination: '123',
      id: 'bar',
    };
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={linkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--bar');
    expect(link).toHaveTextContent('current dashboard');
    await userEvent.click(link);
    expect(coreServices.application.navigateToApp).toBeCalledTimes(0);
    expect(window.open).toBeCalledTimes(0);
  });

  test('shows dashboard title and description in tooltip', async () => {
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={defaultLinkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--foo');
    await userEvent.hover(link);
    const tooltip = await screen.findByTestId('dashboardLink--foo--tooltip');
    expect(tooltip).toHaveTextContent('another dashboard'); // title
    expect(tooltip).toHaveTextContent('something awesome'); // description
  });

  test('can override link label', async () => {
    const label = 'my custom label';
    const linkInfo = {
      ...defaultLinkInfo,
      label,
    };
    render(
      <LinksContext.Provider value={linksEmbeddable}>
        <DashboardLinkComponent
          link={linkInfo}
          layout={LINKS_VERTICAL_LAYOUT}
          onLoading={onLoading}
          onRender={onRender}
        />
      </LinksContext.Provider>
    );
    await waitFor(() => expect(onLoading).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent(label);
    await userEvent.hover(link);
    const tooltip = await screen.findByTestId('dashboardLink--foo--tooltip');
    expect(tooltip).toHaveTextContent(label);
  });
});
