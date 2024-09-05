/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS } from '@kbn/presentation-util-plugin/public';
import { createEvent, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LINKS_VERTICAL_LAYOUT } from '../../../common/content_management';
import { DashboardLinkComponent } from './dashboard_link_component';
import { DashboardLinkStrings } from './dashboard_link_strings';
import { getMockLinksParentApi } from '../../mocks';
import { ResolvedLink } from '../../types';
import { BehaviorSubject } from 'rxjs';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';

function createMockLinksParent({
  initialQuery,
  initialFilters,
}: {
  initialQuery?: Query | AggregateQuery;
  initialFilters?: Filter[];
}) {
  const parent = {
    ...getMockLinksParentApi({ savedObjectId: '456' }),
    locator: {
      getRedirectUrl: jest.fn().mockReturnValue('https://my-kibana.com/dashboard/123'),
      navigate: jest.fn(),
    },
    getSerializedStateForChild: jest.fn(),
    query$: new BehaviorSubject<Query | AggregateQuery | undefined>(initialQuery),
    filters$: new BehaviorSubject<Filter[] | undefined>(initialFilters ?? []),
  };
  return parent;
}

describe('Dashboard link component', () => {
  const resolvedLink: ResolvedLink = {
    id: 'foo',
    order: 0,
    type: 'dashboardLink',
    label: '',
    destination: '456',
    title: 'Dashboard 1',
    description: 'Dashboard 1 description',
  };

  beforeEach(async () => {
    window.open = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('by default uses navigate to open in same tab', async () => {
    const parentApi = createMockLinksParent({});
    render(
      <DashboardLinkComponent
        link={resolvedLink}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );

    // renders dashboard title
    const link = screen.getByTestId('dashboardLink--foo');
    expect(link).toHaveTextContent('Dashboard 1');

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
    const parentApi = createMockLinksParent({});
    render(
      <DashboardLinkComponent
        link={resolvedLink}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
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
    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          options: { ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS, openInNewTab: true },
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
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
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      initialQuery,
      initialFilters,
    });

    parentApi.timeRange$ = new BehaviorSubject<TimeRange | undefined>({
      from: 'now-7d',
      to: 'now',
    });

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          options: DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
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
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      initialQuery,
      initialFilters,
    });

    parentApi.timeRange$ = new BehaviorSubject<TimeRange | undefined>({
      from: 'now-7d',
      to: 'now',
    });

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          options: {
            ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
            useCurrentDateRange: false,
          },
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      filters: initialFilters,
      query: initialQuery,
    });
  });

  test('does not pass filters or query to locator.getRedirectUrl if useCurrentFilters is false', async () => {
    const initialFilters = [
      {
        query: { match_phrase: { foo: 'bar' } },
        meta: { alias: null, disabled: false, negate: false },
      },
    ];
    const initialQuery = { query: 'fiddlesticks: "*"', language: 'lucene' };
    const parentApi = createMockLinksParent({
      initialQuery,
      initialFilters,
    });

    parentApi.timeRange$ = new BehaviorSubject<TimeRange | undefined>({
      from: 'now-7d',
      to: 'now',
    });

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          options: {
            ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
            useCurrentFilters: false,
          },
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );
    expect(parentApi.locator?.getRedirectUrl).toBeCalledWith({
      dashboardId: '456',
      timeRange: { from: 'now-7d', to: 'now' },
      filters: [],
    });
  });

  test('shows an error when fetchDashboard fails', async () => {
    const parentApi = createMockLinksParent({});

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          title: 'Error fetching dashboard',
          error: new Error('not found'),
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );
    const link = await screen.findByTestId('dashboardLink--foo--error');
    expect(link).toHaveTextContent(DashboardLinkStrings.getDashboardErrorLabel());
  });

  test('current dashboard is not a clickable href', async () => {
    const parentApi = createMockLinksParent({});
    parentApi.savedObjectId = new BehaviorSubject<string | undefined>('123');
    parentApi.panelTitle = new BehaviorSubject<string | undefined>('current dashboard');

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          destination: '123',
          id: 'bar',
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );

    const link = screen.getByTestId('dashboardLink--bar');
    expect(link).toHaveTextContent('current dashboard');
    userEvent.click(link);
    expect(parentApi.locator?.navigate).toBeCalledTimes(0);
    expect(window.open).toBeCalledTimes(0);
  });

  test('shows dashboard title and description in tooltip', async () => {
    const parentApi = createMockLinksParent({});

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          title: 'another dashboard',
          description: 'something awesome',
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );

    const link = screen.getByTestId('dashboardLink--foo');
    userEvent.hover(link);
    const tooltip = await screen.findByTestId('dashboardLink--foo--tooltip');
    expect(tooltip).toHaveTextContent('another dashboard'); // title
    expect(tooltip).toHaveTextContent('something awesome'); // description
  });

  test('current dashboard title updates when parent changes', async () => {
    const parentApi = {
      ...createMockLinksParent({}),
      panelTitle: new BehaviorSubject<string | undefined>('old title'),
      panelDescription: new BehaviorSubject<string | undefined>('old description'),
      savedObjectId: new BehaviorSubject<string | undefined>('123'),
    };

    const { rerender } = render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          destination: '123',
          id: 'bar',
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );
    expect(await screen.findByTestId('dashboardLink--bar')).toHaveTextContent('old title');

    parentApi.panelTitle.next('new title');
    rerender(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          destination: '123',
          id: 'bar',
          label: undefined,
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );
    expect(await screen.findByTestId('dashboardLink--bar')).toHaveTextContent('new title');
  });

  test('can override link label', async () => {
    const label = 'my custom label';
    const parentApi = createMockLinksParent({});
    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          label,
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
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
    const parentApi = createMockLinksParent({});
    parentApi.savedObjectId = new BehaviorSubject<string | undefined>('123');

    render(
      <DashboardLinkComponent
        link={{
          ...resolvedLink,
          destination: '123',
          id: 'bar',
          label: customLabel,
        }}
        layout={LINKS_VERTICAL_LAYOUT}
        parentApi={parentApi}
      />
    );

    const link = screen.getByTestId('dashboardLink--bar');
    expect(link).toHaveTextContent(customLabel);
  });
});
