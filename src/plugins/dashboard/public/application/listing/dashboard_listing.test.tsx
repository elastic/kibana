/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';

import { I18nProvider, FormattedRelative } from '@kbn/i18n-react';
import { SimpleSavedObject } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  TableListViewKibanaDependencies,
  TableListViewKibanaProvider,
} from '@kbn/content-management-table-list';

import { DashboardAppServices } from '../../types';
import { DashboardListing, DashboardListingProps } from './dashboard_listing';
import { makeDefaultServices } from '../test_helpers';
import { pluginServices } from '../../services/plugin_services';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_session_storage/dashboard_session_storage_service';

function makeDefaultProps(): DashboardListingProps {
  return {
    redirectTo: jest.fn(),
    kbnUrlStateStorage: createKbnUrlStateStorage(),
  };
}

function mountWith({
  props: incomingProps,
  services: incomingServices,
}: {
  props?: DashboardListingProps;
  services?: DashboardAppServices;
}) {
  const services = incomingServices ?? makeDefaultServices();
  const props = incomingProps ?? makeDefaultProps();
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    const { application, notifications, savedObjectsTagging } = pluginServices.getServices();

    return (
      <I18nProvider>
        {/* Can't get rid of KibanaContextProvider here yet because of 'call to action when no dashboards exist' tests below */}
        <KibanaContextProvider services={services}>
          <TableListViewKibanaProvider
            core={{
              application:
                application as unknown as TableListViewKibanaDependencies['core']['application'],
              notifications,
            }}
            savedObjectsTagging={
              {
                ui: { ...savedObjectsTagging },
              } as unknown as TableListViewKibanaDependencies['savedObjectsTagging']
            }
            FormattedRelative={FormattedRelative}
            toMountPoint={() => () => () => undefined}
          >
            {children}
          </TableListViewKibanaProvider>
        </KibanaContextProvider>
      </I18nProvider>
    );
  };
  const component = mount(<DashboardListing {...props} />, { wrappingComponent });
  return { component, props, services };
}

describe('after fetch', () => {
  test('renders all table rows', async () => {
    const { component } = mountWith({});
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('renders call to action when no dashboards exist', async () => {
    const services = makeDefaultServices();
    services.savedDashboards.find = () => {
      return Promise.resolve({
        total: 0,
        hits: [],
      });
    };
    const { component } = mountWith({ services });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('renders call to action with continue when no dashboards exist but one is in progress', async () => {
    const services = makeDefaultServices();
    services.savedDashboards.find = () => {
      return Promise.resolve({
        total: 0,
        hits: [],
      });
    };
    pluginServices.getServices().dashboardSessionStorage.getDashboardIdsWithUnsavedChanges = jest
      .fn()
      .mockReturnValueOnce([DASHBOARD_PANELS_UNSAVED_ID])
      .mockReturnValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']);
    const { component } = mountWith({ services });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('initialFilter', async () => {
    const props = makeDefaultProps();
    props.initialFilter = 'testFilter';
    const { component } = mountWith({ props });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('When given a title that matches multiple dashboards, filter on the title', async () => {
    const title = 'search by title';
    const props = makeDefaultProps();
    props.title = title;
    pluginServices.getServices().savedObjects.client.find = <T extends unknown>() => {
      return Promise.resolve({
        perPage: 10,
        total: 2,
        page: 0,
        savedObjects: [
          { attributes: { title: `${title}_number1` }, id: 'hello there' } as SimpleSavedObject<T>,
          { attributes: { title: `${title}_number2` }, id: 'goodbye' } as SimpleSavedObject<T>,
        ],
      });
    };
    const { component } = mountWith({ props });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
    expect(props.redirectTo).not.toHaveBeenCalled();
  });

  test('When given a title that matches one dashboard, redirect to dashboard', async () => {
    const title = 'search by title';
    const props = makeDefaultProps();
    props.title = title;
    pluginServices.getServices().savedObjects.client.find = <T extends unknown>() => {
      return Promise.resolve({
        perPage: 10,
        total: 1,
        page: 0,
        savedObjects: [{ attributes: { title }, id: 'you_found_me' } as SimpleSavedObject<T>],
      });
    };
    const { component } = mountWith({ props });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(props.redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: 'you_found_me',
      useReplace: true,
    });
  });

  test('showWriteControls', async () => {
    pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

    const { component } = mountWith({});
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });
});
