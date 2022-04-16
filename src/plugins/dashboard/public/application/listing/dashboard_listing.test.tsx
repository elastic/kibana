/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';

import { DashboardAppServices } from '../../types';
import { SimpleSavedObject } from '@kbn/core/public';
import { KibanaContextProvider } from '../../services/kibana_react';
import { createKbnUrlStateStorage } from '../../services/kibana_utils';
import { DashboardListing, DashboardListingProps } from './dashboard_listing';
import { makeDefaultServices } from '../test_helpers';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_session_storage';

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
    return (
      <I18nProvider>
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
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
    services.dashboardSessionStorage.getDashboardIdsWithUnsavedChanges = () => [
      DASHBOARD_PANELS_UNSAVED_ID,
    ];
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
    const services = makeDefaultServices();
    services.savedObjectsClient.find = <T extends unknown>() => {
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
    const { component } = mountWith({ props, services });
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
    const services = makeDefaultServices();
    services.savedObjectsClient.find = <T extends unknown>() => {
      return Promise.resolve({
        perPage: 10,
        total: 1,
        page: 0,
        savedObjects: [{ attributes: { title }, id: 'you_found_me' } as SimpleSavedObject<T>],
      });
    };
    const { component } = mountWith({ props, services });
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
    const services = makeDefaultServices();
    services.dashboardCapabilities.showWriteControls = false;
    const { component } = mountWith({ services });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });

  test('renders warning when listingLimit is exceeded', async () => {
    const services = makeDefaultServices();
    services.savedObjects.settings.getListingLimit = () => 1;
    const { component } = mountWith({ services });
    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();
    expect(component).toMatchSnapshot();
  });
});
