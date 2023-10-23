/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getEmbeddableParams } from '@kbn/dashboard-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { mockLinksPanel } from '../../../common/mocks';
import { LinksContext, LinksEmbeddable } from '../../embeddable/links_embeddable';
import { DashboardLinkComponent } from './dashboard_link_component';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { fetchDashboard } from './dashboard_link_tools';

jest.mock('./dashboard_link_tools');

jest.mock('@kbn/dashboard-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/dashboard-plugin/public');
  return {
    __esModule: true,
    ...originalModule,
    getEmbeddableParams: jest.fn(),
  };
});

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
  let dashboardContainer: DashboardContainer;
  beforeEach(async () => {
    window.open = jest.fn();
    (fetchDashboard as jest.Mock).mockResolvedValue(mockDashboards[0]);
    linksEmbeddable = await mockLinksPanel({
      dashboardExplicitInput: mockDashboards[1].attributes,
    });
    dashboardContainer = linksEmbeddable.parent as DashboardContainer;
    dashboardContainer.locator = {
      getRedirectUrl: jest.fn().mockReturnValue('https://my-kibana.com/dashboard/123'),
      navigate: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigate to open in same tab', async () => {
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
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));

    const link = await screen.findByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent('another dashboard');
    userEvent.click(link);
    expect(dashboardContainer.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
    });
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(1);
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
    await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    const link = await screen.findByTestId('dashboardLink--foo');
    expect(link).toBeInTheDocument();
    userEvent.click(link);
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toHaveBeenCalledWith('https://my-kibana.com/dashboard/123', '_blank');
  });

  test('passes linkOptions to getEmbeddableParams', async () => {
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
    expect(getEmbeddableParams).toHaveBeenCalledWith(linksEmbeddable, linkInfo.options);
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
    userEvent.click(link);
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(0);
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
    userEvent.hover(link);
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
    userEvent.hover(link);
    const tooltip = await screen.findByTestId('dashboardLink--foo--tooltip');
    expect(tooltip).toHaveTextContent(label);
  });
});
