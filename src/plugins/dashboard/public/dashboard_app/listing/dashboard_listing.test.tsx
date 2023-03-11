/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import {
  TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list';
import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { pluginServices } from '../../services/plugin_services';
import { DashboardListing, DashboardListingProps } from './dashboard_listing';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_session_storage/dashboard_session_storage_service';

jest.mock('react-router-dom', () => {
  return {
    useLocation: () => ({
      search: '',
    }),
    useHistory: () => ({
      push: () => undefined,
    }),
  };
});

function makeDefaultProps(): DashboardListingProps {
  return {
    redirectTo: jest.fn(),
    kbnUrlStateStorage: createKbnUrlStateStorage(),
  };
}

function mountWith({ props: incomingProps }: { props?: DashboardListingProps }) {
  const props = incomingProps ?? makeDefaultProps();
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    const { application, notifications, savedObjectsTagging, http, overlays } =
      pluginServices.getServices();

    return (
      <I18nProvider>
        <TableListViewKibanaProvider
          core={{
            application:
              application as unknown as TableListViewKibanaDependencies['core']['application'],
            notifications,
            http,
            overlays,
          }}
          savedObjectsTagging={
            {
              ui: {
                ...savedObjectsTagging,
                parseSearchQuery: async () => ({
                  searchTerm: '',
                  tagReferences: [],
                  tagReferencesToExclude: [],
                }),
                components: {
                  TagList: () => null,
                },
              },
            } as unknown as TableListViewKibanaDependencies['savedObjectsTagging']
          }
          FormattedRelative={FormattedRelative}
          toMountPoint={() => () => () => undefined}
        >
          {children}
        </TableListViewKibanaProvider>
      </I18nProvider>
    );
  };
  const component = mount(<DashboardListing {...props} />, { wrappingComponent });
  return { component, props };
}

describe('after fetch', () => {
  test('renders all table rows', async () => {
    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({}));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
  });

  test('renders call to action when no dashboards exist', async () => {
    (
      pluginServices.getServices().dashboardSavedObject.findDashboards.findSavedObjects as jest.Mock
    ).mockResolvedValue({
      total: 0,
      hits: [],
    });

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({}));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
  });

  test('renders call to action with continue when no dashboards exist but one is in progress', async () => {
    pluginServices.getServices().dashboardSessionStorage.getDashboardIdsWithUnsavedChanges = jest
      .fn()
      .mockReturnValueOnce([DASHBOARD_PANELS_UNSAVED_ID])
      .mockReturnValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']);
    (
      pluginServices.getServices().dashboardSavedObject.findDashboards.findSavedObjects as jest.Mock
    ).mockResolvedValue({
      total: 0,
      hits: [],
    });

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({}));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
  });

  test('initialFilter', async () => {
    const props = makeDefaultProps();
    props.initialFilter = 'testFilter';

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({}));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
  });

  test('When given a title that matches multiple dashboards, filter on the title', async () => {
    const title = 'search by title';
    const props = makeDefaultProps();
    props.title = title;
    (
      pluginServices.getServices().dashboardSavedObject.findDashboards.findByTitle as jest.Mock
    ).mockResolvedValue(undefined);

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({ props }));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
    expect(props.redirectTo).not.toHaveBeenCalled();
  });

  test('When given a title that matches one dashboard, redirect to dashboard', async () => {
    const title = 'search by title';
    const props = makeDefaultProps();
    props.title = title;
    (
      pluginServices.getServices().dashboardSavedObject.findDashboards.findByTitle as jest.Mock
    ).mockResolvedValue({ id: 'you_found_me' });

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({ props }));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(props.redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: 'you_found_me',
      useReplace: true,
    });
  });

  test('showWriteControls', async () => {
    pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

    let component: ReactWrapper;

    await act(async () => {
      ({ component } = mountWith({}));
    });

    // Ensure the state changes are reflected
    component!.update();
    expect(component!).toMatchSnapshot();
  });
});
