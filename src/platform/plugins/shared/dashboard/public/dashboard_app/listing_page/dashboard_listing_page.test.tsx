/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import React from 'react';
import { faker } from '@faker-js/faker';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import type { DashboardListingPageProps } from './dashboard_listing_page';
import { DashboardListingPage } from './dashboard_listing_page';
import { coreServices } from '../../services/kibana_services';

const mockUseParams = vi.fn().mockReturnValue({});
vi.mock('react-router-dom', () => {
  const mocked = {
    ...require('react-router-dom'),
    useParams: () => mockUseParams(),
  };
  return { ...mocked, default: mocked };
});

const mockGetListingTabs = vi.fn().mockReturnValue([]);
vi.mock('../hooks/dashboard_mount_context', () => {
  const mocked = {
    useDashboardMountContext: () => ({ getListingTabs: mockGetListingTabs }),
  };
  return { ...mocked, default: mocked };
});

// Mock child components. The Dashboard listing page mostly passes down props to shared UX components which are tested in their own packages.
import { DashboardListing } from '../../dashboard_listing/dashboard_listing';
vi.mock('../../dashboard_listing/dashboard_listing', () => {
  return {
    __esModule: true,
    DashboardListing: vi.fn().mockReturnValue(null),
  };
});

import { DashboardAppNoDataPage } from '../no_data/dashboard_app_no_data';
import { dataService } from '../../services/kibana_services';

const mockIsDashboardAppInNoDataState = vi.fn().mockResolvedValue(false);
vi.mock('../no_data/dashboard_app_no_data', async () => {
  const originalModule = await vi.importActual('../no_data/dashboard_app_no_data');
  return {
    __esModule: true,
    ...originalModule,
    isDashboardAppInNoDataState: () => mockIsDashboardAppInNoDataState(),
    DashboardAppNoDataPage: vi.fn().mockReturnValue(null),
  };
});

const mockFindByTitle = vi.fn();
vi.mock('../../dashboard_client', () => {
  const mocked = {
    findService: {
      findByTitle: () => mockFindByTitle(),
    },
  };
  return { ...mocked, default: mocked };
});

const renderDashboardListingPage = (props: Partial<DashboardListingPageProps> = {}) =>
  render(
    <DashboardListingPage
      redirectTo={vi.fn()}
      kbnUrlStateStorage={createKbnUrlStateStorage()}
      {...props}
    />,
    { wrapper: I18nProvider }
  );

test('renders analytics no data page when the user has no data view', async () => {
  mockIsDashboardAppInNoDataState.mockResolvedValueOnce(true);
  dataService.dataViews.hasData.hasDataView = vi.fn().mockResolvedValue(false);

  renderDashboardListingPage();

  await waitFor(() => {
    expect(DashboardAppNoDataPage).toHaveBeenCalled();
  });
});

test('initialFilter is passed through if title is not provided', async () => {
  const initialFilter = faker.lorem.word();

  renderDashboardListingPage({ initialFilter });

  await waitFor(() => {
    expect(DashboardListing).toHaveBeenCalledWith(
      expect.objectContaining({ initialFilter }),
      expect.any(Object) // react context
    );
  });
});

test('When given a title that matches multiple dashboards, filter on the title', async () => {
  mockFindByTitle.mockResolvedValue(undefined);
  const redirectTo = vi.fn();

  renderDashboardListingPage({ title: 'search by title', redirectTo });

  await waitFor(() => {
    expect(redirectTo).not.toHaveBeenCalled();
    expect(DashboardListing).toHaveBeenCalledWith(
      expect.objectContaining({ initialFilter: 'search by title' }),
      expect.any(Object) // react context
    );
  });
});

test('When given a title that matches one dashboard, redirect to dashboard', async () => {
  mockFindByTitle.mockResolvedValue({
    id: 'you_found_me',
  });
  const redirectTo = vi.fn();

  renderDashboardListingPage({ title: 'search by title', redirectTo });

  await waitFor(() => {
    expect(redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: 'you_found_me',
      useReplace: true,
    });
  });
});

test('sets only "Dashboards" breadcrumb on default tab', async () => {
  renderDashboardListingPage();

  await waitFor(() => {
    expect(coreServices.chrome.setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Dashboards' }], {
      project: { value: [] },
    });
  });
});

test('sets "Dashboards > Tab Title" breadcrumbs on active tab', async () => {
  mockUseParams.mockReturnValue({ activeTab: 'visualizations' });
  mockGetListingTabs.mockReturnValue([
    { id: 'visualizations', title: 'Visualizations', getTableList: vi.fn() },
  ]);

  renderDashboardListingPage();

  await waitFor(() => {
    expect(coreServices.chrome.setBreadcrumbs).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          text: 'Dashboards',
          'data-test-subj': 'dashboardListingBreadcrumb-visualizations',
        }),
        { text: 'Visualizations' },
      ],
      { project: { value: [{ text: 'Visualizations' }] } }
    );
  });
});
