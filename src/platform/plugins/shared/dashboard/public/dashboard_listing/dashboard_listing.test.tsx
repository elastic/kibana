/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { render, waitFor, screen } from '@testing-library/react';

/**
 * Mocks the page chrome and provider stack so this suite focuses on tab
 * wiring, header actions, and the active-tab branch. Behavioral coverage
 * for the bundle hook lives in `hooks/use_dashboard_listing_table.test.tsx`;
 * `KibanaContentListPage` and `ContentListClientProvider` have their own
 * package tests.
 */
import { DashboardListing } from './dashboard_listing';
import { DashboardListingTable } from './dashboard_listing_table';
import type { DashboardListingProps, DashboardListingTab } from './types';

jest.mock('@kbn/content-list-page', () => {
  const Page = ({ children, ...rest }: any) => (
    <div data-test-subj="dashboard-listing-page" data-page-props={JSON.stringify(rest)}>
      {children}
    </div>
  );
  const Header = (props: any) => (
    <div
      data-test-subj="dashboard-listing-header"
      data-tabs={JSON.stringify(
        (props.tabs ?? []).map((tab: any) => ({ label: tab.label, isSelected: tab.isSelected }))
      )}
      data-has-actions={props.actions ? 'true' : 'false'}
      data-title={props.title}
    >
      {props.actions}
    </div>
  );
  const Section = ({ children }: any) => (
    <div data-test-subj="dashboard-listing-section">{children}</div>
  );
  Page.Header = Header;
  Page.Section = Section;
  return { KibanaContentListPage: Page };
});

jest.mock('./content', () => ({
  DashboardListingContent: ({ bundle }: any) => (
    <div
      data-test-subj="dashboard-listing-content"
      data-features={JSON.stringify(bundle.providerProps.features ?? {})}
    />
  ),
  DashboardListingProviders: ({ children }: any) => <>{children}</>,
}));

jest.mock('./hooks/use_dashboard_listing_table', () => ({
  useDashboardListingTable: jest.fn(() => ({
    providerProps: {
      id: 'dashboard-listing',
      labels: { entity: 'dashboard', entityPlural: 'dashboards' },
      isReadOnly: false,
      services: {},
      features: {},
      findItems: jest.fn(),
      item: { getHref: jest.fn() },
      contentEditor: { openContentEditor: jest.fn() },
    },
    itemActionGuard: { enabled: () => true, disabledReason: () => undefined },
    emptyPrompt: null,
    toolbarFilters: null,
    createItem: jest.fn(),
  })),
}));

const renderDashboardListing = (
  props: Partial<DashboardListingProps> = {},
  { initialEntries = ['/list'] }: { initialEntries?: string[] } = {}
) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Route path={['/list/:activeTab', '/list']}>
          <DashboardListing
            goToDashboard={jest.fn()}
            getDashboardUrl={jest.fn()}
            getTabs={() => []}
            {...props}
          />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders the page header with the dashboards tab and create action', () => {
  renderDashboardListing();

  const header = screen.getByTestId('dashboard-listing-header');
  expect(header).toHaveAttribute('data-title', 'Dashboards');
  expect(header).toHaveAttribute('data-has-actions', 'true');

  const tabs = JSON.parse(header.getAttribute('data-tabs')!);
  expect(tabs).toEqual([{ label: 'Dashboards', isSelected: true }]);
});

test('works without getTabs (for embedded use cases)', () => {
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/list']}>
        <Route path={['/list/:activeTab', '/list']}>
          <DashboardListing goToDashboard={jest.fn()} getDashboardUrl={jest.fn()} />
        </Route>
      </MemoryRouter>
    </I18nProvider>
  );

  const tabs = JSON.parse(
    screen.getByTestId('dashboard-listing-header').getAttribute('data-tabs')!
  );
  expect(tabs).toHaveLength(1);
  expect(tabs[0].label).toBe('Dashboards');
});

test('selects an external tab when matching activeTab is in the URL', async () => {
  const externalTab: DashboardListingTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn().mockResolvedValue(<div data-test-subj="external-tab-content" />),
  };

  renderDashboardListing(
    { getTabs: () => [externalTab] },
    { initialEntries: ['/list/custom-tab'] }
  );

  const tabs = JSON.parse(
    screen.getByTestId('dashboard-listing-header').getAttribute('data-tabs')!
  );
  expect(tabs).toEqual([
    { label: 'Dashboards', isSelected: false },
    { label: 'Custom Tab', isSelected: true },
  ]);
  await waitFor(() => expect(externalTab.getTableList).toHaveBeenCalled());
});

test('appends additional tabs after the dashboards tab', () => {
  const externalTab: DashboardListingTab = {
    id: 'annotations',
    title: 'Annotations',
    getTableList: jest.fn().mockResolvedValue(null),
  };

  renderDashboardListing({ getTabs: () => [externalTab] });

  const tabs = JSON.parse(
    screen.getByTestId('dashboard-listing-header').getAttribute('data-tabs')!
  );
  expect(tabs).toEqual([
    { label: 'Dashboards', isSelected: true },
    { label: 'Annotations', isSelected: false },
  ]);
});

test('falls back to the dashboards tab when the URL has an invalid activeTab', () => {
  renderDashboardListing({}, { initialEntries: ['/list/invalid-tab'] });

  const tabs = JSON.parse(
    screen.getByTestId('dashboard-listing-header').getAttribute('data-tabs')!
  );
  expect(tabs).toEqual([{ label: 'Dashboards', isSelected: true }]);
});

test('forwards `onFetchSuccess` and `setPageDataTestSubject` (only) to external tabs', async () => {
  const externalTab: DashboardListingTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn().mockResolvedValue(<div data-test-subj="external-tab-content" />),
  };

  renderDashboardListing(
    { getTabs: () => [externalTab] },
    { initialEntries: ['/list/custom-tab'] }
  );

  await waitFor(() => expect(externalTab.getTableList).toHaveBeenCalled());
  const parentProps = (externalTab.getTableList as jest.Mock).mock.calls[0][0];

  expect(parentProps).toEqual({
    onFetchSuccess: expect.any(Function),
    setPageDataTestSubject: expect.any(Function),
  });
  expect(parentProps).not.toHaveProperty('getBreadcrumbs');
});

describe('DashboardListingTable (embeddable variant)', () => {
  const useDashboardListingTableMock = jest.requireMock('./hooks/use_dashboard_listing_table')
    .useDashboardListingTable as jest.Mock;

  const renderTable = (props: Partial<DashboardListingProps> = {}) =>
    render(
      <I18nProvider>
        <DashboardListingTable goToDashboard={jest.fn()} getDashboardUrl={jest.fn()} {...props} />
      </I18nProvider>
    );

  test('defaults `urlStateEnabled` to true to mirror the legacy TableListView behavior', () => {
    renderTable();
    expect(useDashboardListingTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ urlStateEnabled: true })
    );
  });

  test('forwards `urlStateEnabled={false}` to the bundle hook', () => {
    renderTable({ urlStateEnabled: false });
    expect(useDashboardListingTableMock).toHaveBeenCalledWith(
      expect.objectContaining({ urlStateEnabled: false })
    );
  });
});
