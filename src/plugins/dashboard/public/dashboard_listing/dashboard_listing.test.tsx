/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';

import { pluginServices } from '../services/plugin_services';
import { DashboardListing } from './dashboard_listing';

/**
 * Mock Table List view. This dashboard component is a wrapper around the shared UX table List view. We
 * need to ensure we're passing down the correct props, but the table list view itself doesn't need to be rendered
 * in our tests because it is covered in its package.
 */
import { TableListView } from '@kbn/content-management-table-list-view';
import { DashboardListingProps } from './types';
// import { TableListViewKibanaProvider } from '@kbn/content-management-table-list-view';
jest.mock('@kbn/content-management-table-list-view-table', () => {
  const originalModule = jest.requireActual('@kbn/content-management-table-list-view-table');
  return {
    __esModule: true,
    ...originalModule,
    TableListViewKibanaProvider: jest.fn().mockImplementation(({ children }) => {
      return <>{children}</>;
    }),
  };
});
jest.mock('@kbn/content-management-table-list-view', () => {
  const originalModule = jest.requireActual('@kbn/content-management-table-list-view-table');
  return {
    __esModule: true,
    ...originalModule,
    TableListView: jest.fn().mockReturnValue(null),
  };
});

function makeDefaultProps(): DashboardListingProps {
  return {
    goToDashboard: jest.fn(),
    getDashboardUrl: jest.fn(),
  };
}

function mountWith({ props: incomingProps }: { props?: Partial<DashboardListingProps> }) {
  const props = { ...makeDefaultProps(), ...incomingProps };
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return <I18nProvider>{children}</I18nProvider>;
  };
  const component = mount(<DashboardListing {...props} />, { wrappingComponent });
  return { component, props };
}

test('initial filter is passed through', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({ props: { initialFilter: 'kibanana' } }));
  });
  component!.update();
  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({ initialFilter: 'kibanana' }),
    expect.any(Object) // react context
  );
});

test('when showWriteControls is true, table list view is passed editing functions', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = true;

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({}));
  });
  component!.update();
  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      createItem: expect.any(Function),
      deleteItems: expect.any(Function),
      editItem: expect.any(Function),
    }),
    expect.any(Object) // react context
  );
});

test('when showWriteControls is false, table list view is not passed editing functions', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

  let component: ReactWrapper;

  await act(async () => {
    ({ component } = mountWith({}));
  });
  component!.update();
  expect(TableListView).toHaveBeenCalledWith(
    expect.objectContaining({
      createItem: undefined,
      deleteItems: undefined,
      editItem: undefined,
    }),
    expect.any(Object) // react context
  );
});
