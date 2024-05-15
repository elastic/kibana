/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { buildMockDashboard } from '@kbn/dashboard-plugin/public/mocks';
import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { DashboardLinkComponent } from './dashboard_link_component';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { getMockLinksApi } from '../../mocks';
import { ResolvedLink } from '../../embeddable/types';
import { BehaviorSubject } from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { DashboardContainerInput } from '@kbn/dashboard-plugin/common';

function createMockLinksParent({
  overrides,
  initialQuery,
  initialFilters,
  savedObjectId,
}: {
  overrides?: Partial<DashboardContainerInput>;
  initialQuery?: Query | AggregateQuery;
  initialFilters?: Filter[];
  savedObjectId?: string;
}) {
  const parent = buildMockDashboard({ overrides, savedObjectId });
  parent.locator = {
    getRedirectUrl: jest.fn().mockReturnValue('https://my-kibana.com/dashboard/123'),
    navigate: jest.fn(),
  };

  // setting the filter$ and query$ are delayed in the DashboardContainer
  // so we manually set them for these tests
  const query$ = new BehaviorSubject<Query | AggregateQuery | undefined>(initialQuery);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(initialFilters ?? []);
  parent.query$ = query$;
  parent.filters$ = filters$;
  return parent;
}

describe('Dashboard link component', () => {
  const defaultLinkInfo = {
    destination: '456',
    order: 1,
    id: 'foo',
    type: 'dashboardLink' as const,
  };

  beforeEach(async () => {
    window.open = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigate to open in same tab', async () => {
    const parentApi = createMockLinksParent({});
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi,
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
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      filters: [],
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    });
    expect(parentApi.locator?.navigate).toBeCalledTimes(1);
  });

  test('modified click does not trigger event.preventDefault', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: createMockLinksParent({}),
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
    const parentApi = createMockLinksParent({});
    const linkInfo = {
      ...defaultLinkInfo,
      options: { ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS, openInNewTab: true },
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi,
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
    expect(parentApi.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toHaveBeenCalledWith('https://my-kibana.com/dashboard/123', '_blank');
  });

  test('passes query, filters, and timeRange to locator.getRedirectUrl by default', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
    };
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      overrides: {
        timeRange: { from: 'now-7d', to: 'now' },
      },
      initialQuery,
      initialFilters,
    });

    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      timeRange: { from: 'now-7d', to: 'now' },
      filters: initialFilters,
      query: initialQuery,
    });
  });

  test('does not pass timeRange to locator.getRedirectUrl if useCurrentDateRange is false', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
        useCurrentDateRange: false,
      },
    };
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      overrides: {
        timeRange: { from: 'now-7d', to: 'now' },
      },
      initialQuery,
      initialFilters,
    });

    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      filters: initialFilters,
      query: initialQuery,
    });
  });

  test('does not pass filters or query to locator.getRedirectUrl if useCurrentFilters is false', async () => {
    const linkInfo = {
      ...defaultLinkInfo,
      options: {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
        useCurrentFilters: false,
      },
    };
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      overrides: {
        timeRange: { from: 'now-7d', to: 'now' },
      },
      initialQuery,
      initialFilters,
    });

    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi,
    });
    render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      timeRange: { from: 'now-7d', to: 'now' },
      filters: [],
    });
  });

  test('shows an error when fetchDashboard fails', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: createMockLinksParent({}),
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
    const parentApi = createMockLinksParent({
      overrides: { title: 'current dashboard' },
      savedObjectId: '123',
    });

    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi,
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
    expect(parentApi.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toBeCalledTimes(0);
  });

  test('shows dashboard title and description in tooltip', async () => {
    const linksApi = getMockLinksApi({
      attributes: { links: [defaultLinkInfo] },
      parentApi: createMockLinksParent({}),
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

  test('current dashboard title updates when parent changes', async () => {
    const parentApi = {
      ...getMockPresentationContainer(),
      filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
      query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
      timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
      panelTitle: new BehaviorSubject<string | undefined>('old title'),
      panelDescription: new BehaviorSubject<string | undefined>('old description'),
      hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
      savedObjectId: new BehaviorSubject<string | undefined>('123'),
    };

    const linksApi = getMockLinksApi({
      attributes: { links: [{ ...defaultLinkInfo, destination: '123', id: 'bar' }] },
      parentApi,
    });

    const { rerender } = render(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    expect(await screen.findByTestId('dashboardLink--bar')).toHaveTextContent('old title');

    parentApi.panelTitle.next('new title');
    rerender(
      <DashboardLinkComponent
        link={linksApi.resolvedLinks$.value[0]}
        layout={LINKS_VERTICAL_LAYOUT}
        api={linksApi}
      />
    );
    expect(await screen.findByTestId('dashboardLink--bar')).toHaveTextContent('new title');
  });

  test('can override link label', async () => {
    const label = 'my custom label';
    const linkInfo = {
      ...defaultLinkInfo,
      label,
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: createMockLinksParent({}),
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

  test('can override link label for the current dashboard', async () => {
    const customLabel = 'my new label for the current dashboard';
    const linkInfo = {
      ...defaultLinkInfo,
      destination: '123',
      id: 'bar',
      label: customLabel,
    };
    const linksApi = getMockLinksApi({
      attributes: { links: [linkInfo] },
      parentApi: createMockLinksParent({
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
    expect(link).toHaveTextContent(customLabel);
  });
});
