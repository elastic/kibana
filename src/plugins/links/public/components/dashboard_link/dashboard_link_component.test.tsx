/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getDashboardLocatorParamsFromEmbeddable } from '@kbn/dashboard-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { buildMockDashboard } from '@kbn/dashboard-plugin/public/mocks';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { DashboardLinkComponent } from './dashboard_link_component';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { getMockLinksApi } from '../../react_embeddable/mocks';
import { ResolvedLink } from '../../react_embeddable/types';

jest.mock('@kbn/dashboard-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/dashboard-plugin/public');
  return {
    __esModule: true,
    ...originalModule,
    getDashboardLocatorParamsFromEmbeddable: jest.fn(),
  };
});

describe('Dashboard link component', () => {
  const defaultLinkInfo = {
    destination: '456',
    order: 1,
    id: 'foo',
    type: 'dashboardLink' as const,
  };

  let dashboardContainer: DashboardContainer;
  beforeEach(async () => {
    window.open = jest.fn();
    dashboardContainer = buildMockDashboard();
    dashboardContainer.locator = {
      getRedirectUrl: jest.fn().mockReturnValue('https://my-kibana.com/dashboard/123'),
      navigate: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigate to open in same tab', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: dashboardContainer,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );

    // renders dashboard title
    const link = screen.getByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent('Link 0');

    // does not render external link icon
    const externalIcon = within(link).queryByText('External link');
    expect(externalIcon).toBeNull();

    // calls `navigate` on click
    userEvent.click(link);
    expect(dashboardContainer.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
    });
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(1);
  });

  test('modified click does not trigger event.preventDefault', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: dashboardContainer,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    const link = screen.getByTestId('dashboardLink--foo');
    const clickEvent = createEvent.click(link, { ctrlKey: true });
    const preventDefault = jest.spyOn(clickEvent, 'preventDefault');
    fireEvent(link, clickEvent);
    expect(preventDefault).toHaveBeenCalledTimes(0);
  });

  test('openInNewTab uses window.open, not navigateToApp, and renders external icon', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: { ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS, openInNewTab: true },
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: dashboardContainer,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    const link = screen.getByTestId('dashboardLink--foo');
    expect(link).toBeInTheDocument();

    // external link icon is rendered
    const externalIcon = within(link).getByText('External link');
    expect(externalIcon?.getAttribute('data-euiicon-type')).toBe('popout');

    // calls `window.open`
    userEvent.click(link);
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toHaveBeenCalledWith('https://my-kibana.com/dashboard/123', '_blank');
  });

  test('passes linkOptions to getDashboardLocatorParamsFromEmbeddable', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
        useCurrentFilters: false,
        useCurrentTimeRange: false,
        useCurrentDateRange: false,
      },
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: dashboardContainer,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );

    expect(getDashboardLocatorParamsFromEmbeddable).toHaveBeenCalledWith(
      linksApi,
      linkInfo.options
    );
  });

  test('shows an error when fetchDashboard fails', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: dashboardContainer,
    });
    const resolvedLink: ResolvedLink = {
      ...defaultLinkInfo,
      title: 'Error fetching dashboard',
      error: new Error('not found'),
    };
    render(
      <DashboardLinkComponent link={resolvedLink} layout={LINKS_VERTICAL_LAYOUT} api={linksApi} />
    );
    const link = await screen.findByTestId('dashboardLink--foo--error');
    expect(link).toHaveTextContent(DashboardLinkStrings.getDashboardErrorLabel());
  });

  test('current dashboard is not a clickable href', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      destination: '123',
      id: 'bar',
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: buildMockDashboard({
        overrides: { title: 'current dashboard' },
        savedObjectId: '123',
      }),
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );

    const link = screen.getByTestId('dashboardLink--bar');
    expect(link).toHaveTextContent('current dashboard');
    userEvent.click(link);
    expect(dashboardContainer.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toBeCalledTimes(0);
  });

  test('shows dashboard title and description in tooltip', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: dashboardContainer,
    });
    const resolvedLink = {
      ...linksApi.resolvedLinks$.value[0],
      title: 'another dashboard',
      description: 'something awesome',
    };
    render(
      <DashboardLinkComponent link={resolvedLink} layout={LINKS_VERTICAL_LAYOUT} api={linksApi} />
    );

    const link = screen.getByTestId('dashboardLink--foo');
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
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: dashboardContainer,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    const link = screen.getByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent(label);
    userEvent.hover(link);
    const tooltip = await screen.findByTestId('dashboardLink--foo--tooltip');
    expect(tooltip).toHaveTextContent(label);
  });
});
