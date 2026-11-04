/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { KibanaContentListPage } from '@kbn/content-list-page';
import { render, waitFor, act, screen } from '@testing-library/react';

import { coreServices } from '../services/kibana_services';
import { DashboardListing } from './dashboard_listing';
import type { DashboardListingProps, DashboardListingTab } from './types';
import { openImportDashboardJsonFlyout } from './import_json/open_import_dashboard_json_flyout';

const mockAppHeader = jest.fn().mockReturnValue(null);
jest.mock('@kbn/app-header', () => ({
  __esModule: true,
  get AppHeader() {
    return mockAppHeader;
  },
}));

jest.mock('@kbn/shared-ux-error-boundary', () => ({
  __esModule: true,
  KibanaSectionErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('./import_json/open_import_dashboard_json_flyout', () => ({
  openImportDashboardJsonFlyout: jest.fn(),
}));

const mockOpenImportDashboardJsonFlyout = jest.mocked(openImportDashboardJsonFlyout);

/**
 * Mock the active-tab renderer because these tests verify Dashboard listing shell wiring.
 * Rendering the real component would mount the complete Dashboard table, which is covered
 * independently by its component tests.
 */
const mockActiveTab = jest
  .spyOn(KibanaContentListPage, 'ActiveTab')
  .mockReturnValue(<div>ActiveTab</div>);

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
  (coreServices.application.capabilities as any).dashboard_v2.createNew = true;
});

test('renders the Content List shell with the correct title and dashboards tab', () => {
  renderDashboardListing();

  expect(mockActiveTab).toHaveBeenCalledTimes(1);
  const props = mockActiveTab.mock.calls[0][0];

  expect(props.activeTabId).toBe('dashboards');

  const dashboardTab = props.tabs[0];
  expect(dashboardTab.id).toBe('dashboards');
  expect(dashboardTab.render).toBeDefined();
  expect(dashboardTab.load).toBeUndefined();

  expect(mockAppHeader).toHaveBeenCalledTimes(1);
  const appHeaderProps = mockAppHeader.mock.calls[0][0];
  expect(appHeaderProps.title).toBe('Dashboards');
  expect(appHeaderProps.tabs[0]).toMatchObject({
    id: 'dashboards',
    label: 'Dashboards',
    isSelected: true,
  });

  expect(screen.getByRole('region', { name: 'Dashboards' })).toBeInTheDocument();
});

test('supplies tab props when rendering the dashboards tab', () => {
  const goToDashboard = jest.fn();
  const getDashboardUrl = jest.fn();

  renderDashboardListing({
    goToDashboard,
    getDashboardUrl,
    initialFilter: 'my-filter',
    useSessionStorageIntegration: true,
  });

  const dashboardTab = mockActiveTab.mock.calls[0][0].tabs[0];

  // Builds the element without mounting the real Dashboard table.
  const element = dashboardTab.render?.() as ReactElement;

  expect(element.props).toMatchObject({
    goToDashboard,
    getDashboardUrl,
    initialFilter: 'my-filter',
    useSessionStorageIntegration: true,
    refreshListBouncer: false,
  });
  expect(element.props.parentProps.showCreateButton).toBe(false);
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

  expect(mockActiveTab).toHaveBeenCalledTimes(1);
  const props = mockActiveTab.mock.calls[0][0];
  expect(props.tabs).toHaveLength(1);
  expect(props.tabs[0].id).toBe('dashboards');
});

test('reads activeTab from URL path param when tab exists', () => {
  renderDashboardListing(
    { getTabs: () => [{ id: 'custom-tab', title: 'Custom Tab', getTableList: jest.fn() }] },
    { initialEntries: ['/list/custom-tab'] }
  );

  expect(mockActiveTab).toHaveBeenCalledTimes(1);
  const props = mockActiveTab.mock.calls[0][0];
  expect(props.activeTabId).toBe('custom-tab');
});

test('appends additional tabs to the content and header tabs', () => {
  const tab: DashboardListingTab = {
    id: 'annotations',
    title: 'Annotations',
    getTableList: jest.fn(),
  };

  renderDashboardListing({ getTabs: () => [tab] });

  const contentTab = mockActiveTab.mock.calls[0][0].tabs[1];
  expect(contentTab.id).toBe('annotations');
  expect(contentTab.load).toBeDefined();
  expect(contentTab.render).toBeUndefined();

  const appHeaderProps = mockAppHeader.mock.calls[0][0];
  expect(appHeaderProps.tabs[1]).toMatchObject({
    id: 'annotations',
    label: 'Annotations',
  });
});

test('supplies legacy parent props when loading a registered tab', async () => {
  const getTableList = jest.fn();

  renderDashboardListing({
    getTabs: () => [{ id: 'annotations', title: 'Annotations', getTableList }],
  });

  const tab = mockActiveTab.mock.calls[0][0].tabs[1];

  const load = tab.load;

  expect(load).toBeDefined();

  await act(async () => {
    await load?.();
  });

  expect(getTableList).toHaveBeenCalledTimes(1);

  const parentProps = getTableList.mock.calls[0][0];

  expect(parentProps.showCreateButton).toBe(false);
  expect(parentProps.getBreadcrumbs?.('dashboard')?.[0].text).toBe('Dashboards');
  expect(parentProps.onFetchSuccess()).toBeUndefined();

  act(() => {
    parentProps.setPageDataTestSubject('registeredTabLandingPage');
  });

  expect(screen.getByTestId('registeredTabLandingPage')).toBeInTheDocument();
});

test('changeActiveTab updates route to show new tab', async () => {
  const mockTab: DashboardListingTab = {
    id: 'custom-tab',
    title: 'Custom Tab',
    getTableList: jest.fn(),
  };

  renderDashboardListing({ getTabs: () => [mockTab] });
  const appHeaderProps = mockAppHeader.mock.calls[0][0];
  const customHeaderTab = appHeaderProps.tabs.find(
    (tab: { id: string }) => tab.id === 'custom-tab'
  );

  expect(customHeaderTab).toBeDefined();

  await act(async () => {
    customHeaderTab.onClick();
  });

  // Verify the route change caused a re-render with the new activeTabId
  await waitFor(() => {
    const lastCall = mockActiveTab.mock.calls[mockActiveTab.mock.calls.length - 1][0];
    expect(lastCall.activeTabId).toBe('custom-tab');
  });
});

test('falls back to dashboards tab when URL has invalid activeTab', () => {
  renderDashboardListing({}, { initialEntries: ['/list/invalid-tab'] });

  expect(mockActiveTab).toHaveBeenCalledTimes(1);
  const props = mockActiveTab.mock.calls[0][0];
  expect(props.activeTabId).toBe('dashboards');
});

test.each([
  [false, false],
  [true, true],
])(
  'shows create and import dashboard menu items only when dashboard_v2.createNew is %s',
  (createNew, shouldBePresent) => {
    (coreServices.application.capabilities as any).dashboard_v2.createNew = createNew;
    renderDashboardListing();

    const appHeaderProps = mockAppHeader.mock.calls[mockAppHeader.mock.calls.length - 1][0];
    const createItem = appHeaderProps?.menu?.primaryActionItem;
    const importItem = appHeaderProps?.menu?.items?.find(
      (item: { testId: string }) => item.testId === 'dashboardListingImportButton'
    );
    if (shouldBePresent) {
      expect(createItem).toMatchObject({ testId: 'dashboardListingCreateButton' });
      expect(importItem).toBeDefined();
    } else {
      expect(createItem).toBeUndefined();
      expect(importItem).toBeUndefined();
    }
  }
);

describe('dashboard import', () => {
  test('refreshes the Dashboards tab after a dashboard import', () => {
    renderDashboardListing({}, { initialEntries: ['/list/dashboards'] });

    const initialActiveTabProps = mockActiveTab.mock.calls[mockActiveTab.mock.calls.length - 1][0];

    expect(initialActiveTabProps.tabs[0].render?.()).toMatchObject({
      props: { refreshListBouncer: false },
    });

    const appHeaderProps = mockAppHeader.mock.calls[mockAppHeader.mock.calls.length - 1][0];
    const importItem = appHeaderProps.menu.items.find(
      (item: { testId: string }) => item.testId === 'dashboardListingImportButton'
    );

    act(() => {
      importItem.run();
    });

    const { onImportSuccess } = mockOpenImportDashboardJsonFlyout.mock.calls[0][0];

    act(() => {
      onImportSuccess('dashboard-id', 'Imported dashboard');
    });

    const updatedActiveTabProps = mockActiveTab.mock.calls[mockActiveTab.mock.calls.length - 1][0];

    expect(updatedActiveTabProps.tabs[0].render?.()).toMatchObject({
      props: { refreshListBouncer: true },
    });
  });

  test('does not recreate the active registered tab after a dashboard import', () => {
    renderDashboardListing(
      {
        getTabs: () => [
          {
            id: 'annotations',
            title: 'Annotations',
            getTableList: jest.fn(),
          },
        ],
      },
      { initialEntries: ['/list/annotations'] }
    );

    const initialActiveTabProps = mockActiveTab.mock.calls[mockActiveTab.mock.calls.length - 1][0];
    const initialLoad = initialActiveTabProps.tabs[1].load;
    const initialRenderCount = mockActiveTab.mock.calls.length;

    const appHeaderProps = mockAppHeader.mock.calls[mockAppHeader.mock.calls.length - 1][0];
    const importItem = appHeaderProps.menu.items.find(
      (item: { testId: string }) => item.testId === 'dashboardListingImportButton'
    );

    act(() => {
      importItem.run();
    });

    const { onImportSuccess } = mockOpenImportDashboardJsonFlyout.mock.calls[0][0];

    act(() => {
      onImportSuccess('dashboard-id', 'Imported dashboard');
    });

    expect(mockActiveTab).toHaveBeenCalledTimes(initialRenderCount);

    const currentActiveTabProps = mockActiveTab.mock.calls[mockActiveTab.mock.calls.length - 1][0];

    expect(currentActiveTabProps.tabs[1].load).toBe(initialLoad);
  });
});
