/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper, ComponentType } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
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
import { dashboardContentManagementService } from '../../services/dashboard_services';
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

function makeDefaultProps(): DashboardListingPageProps {
  return {
    redirectTo: jest.fn(),
    kbnUrlStateStorage: createKbnUrlStateStorage(),
  };
}

function mountWith({ props: incomingProps }: { props?: DashboardListingPageProps }) {
  const props = incomingProps ?? makeDefaultProps();
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return <I18nProvider>{children}</I18nProvider>;
  };
  const component = mount(<DashboardListingPage {...props} />, {
    wrappingComponent: wrappingComponent as ComponentType<{}>,
  });
  return { component, props };
}

test('renders analytics no data page when the user has no data view', async () => {
  mockIsDashboardAppInNoDataState.mockResolvedValueOnce(true);
  dataService.dataViews.hasData.hasUserDataView = jest.fn().mockResolvedValue(false);

  let component: ReactWrapper;
  await act(async () => {
    ({ component } = mountWith({}));
  });
  component!.update();
  expect(DashboardAppNoDataPage).toHaveBeenCalled();
});

test('initialFilter is passed through if title is not provided', async () => {
  const props = makeDefaultProps();
  props.initialFilter = 'filterPassThrough';

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({ props }));
  });

  component!.update();
  expect(DashboardListing).toHaveBeenCalledWith(
    expect.objectContaining({ initialFilter: 'filterPassThrough' }),
    expect.any(Object) // react context
  );
});

test('When given a title that matches multiple dashboards, filter on the title', async () => {
  const title = 'search by title';
  const props = makeDefaultProps();
  props.title = title;

  (dashboardContentManagementService.findDashboards.findByTitle as jest.Mock).mockResolvedValue(
    undefined
  );

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({ props }));
  });
  component!.update();

  expect(props.redirectTo).not.toHaveBeenCalled();
  expect(DashboardListing).toHaveBeenCalledWith(
    expect.objectContaining({ initialFilter: 'search by title' }),
    expect.any(Object) // react context
  );
});

test('When given a title that matches one dashboard, redirect to dashboard', async () => {
  const title = 'search by title';
  const props = makeDefaultProps();
  props.title = title;
  (dashboardContentManagementService.findDashboards.findByTitle as jest.Mock).mockResolvedValue({
    id: 'you_found_me',
  });

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({ props }));
  });
  component!.update();
  expect(props.redirectTo).toHaveBeenCalledWith({
    destination: 'dashboard',
    id: 'you_found_me',
    useReplace: true,
  });
});
