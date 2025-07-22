/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { faker } from '@faker-js/faker';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { DashboardListingPage, DashboardListingPageProps } from './dashboard_listing_page';

// Mock child components. The Dashboard listing page mostly passes down props to shared UX components which are tested in their own packages.
import { DashboardListing } from '../../dashboard_listing/dashboard_listing';
jest.mock('../../dashboard_listing/dashboard_listing', () => {
  return {
    __esModule: true,
    DashboardListing: jest.fn().mockReturnValue(null),
  };
});

import { DashboardAppNoDataPage } from '../no_data/dashboard_app_no_data';
import { dataService } from '../../services/kibana_services';
import { getDashboardContentManagementService } from '../../services/dashboard_content_management_service';

const dashboardContentManagementService = getDashboardContentManagementService();
const mockIsDashboardAppInNoDataState = jest.fn().mockResolvedValue(false);

jest.mock('../no_data/dashboard_app_no_data', () => {
  const originalModule = jest.requireActual('../no_data/dashboard_app_no_data');
  return {
    __esModule: true,
    ...originalModule,
    isDashboardAppInNoDataState: () => mockIsDashboardAppInNoDataState(),
    DashboardAppNoDataPage: jest.fn().mockReturnValue(null),
  };
});

const renderDashboardListingPage = (props: Partial<DashboardListingPageProps> = {}) =>
  render(
    <DashboardListingPage
      redirectTo={jest.fn()}
      kbnUrlStateStorage={createKbnUrlStateStorage()}
      {...props}
    />,
    { wrapper: I18nProvider }
  );

test('renders analytics no data page when the user has no data view', async () => {
  mockIsDashboardAppInNoDataState.mockResolvedValueOnce(true);
  dataService.dataViews.hasData.hasUserDataView = jest.fn().mockResolvedValue(false);

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
  (dashboardContentManagementService.findDashboards.findByTitle as jest.Mock).mockResolvedValue(
    undefined
  );

  const redirectTo = jest.fn();

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
  (dashboardContentManagementService.findDashboards.findByTitle as jest.Mock).mockResolvedValue({
    id: 'you_found_me',
  });
  const redirectTo = jest.fn();

  renderDashboardListingPage({ title: 'search by title', redirectTo });

  await waitFor(() => {
    expect(redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: 'you_found_me',
      useReplace: true,
    });
  });
});
