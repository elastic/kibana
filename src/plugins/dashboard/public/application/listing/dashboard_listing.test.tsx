/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mount } from 'enzyme';
import {
  IUiSettingsClient,
  PluginInitializerContext,
  ScopedHistory,
  SimpleSavedObject,
} from '../../../../../core/public';

import { SavedObjectLoader, SavedObjectLoaderFindOptions } from '../../services/saved_objects';
import { IndexPatternsContract, SavedQueryService } from '../../services/data';
import { NavigationPublicPluginStart } from '../../services/navigation';
import { KibanaContextProvider } from '../../services/kibana_react';
import { createKbnUrlStateStorage } from '../../services/kibana_utils';

import { savedObjectsPluginMock } from '../../../../saved_objects/public/mocks';
import { DashboardListing, DashboardListingProps } from './dashboard_listing';
import { embeddablePluginMock } from '../../../../embeddable/public/mocks';
import { visualizationsPluginMock } from '../../../../visualizations/public/mocks';
import { DashboardAppServices, DashboardCapabilities } from '../types';
import { dataPluginMock } from '../../../../data/public/mocks';
import { chromeServiceMock, coreMock } from '../../../../../core/public/mocks';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { UrlForwardingStart } from '../../../../url_forwarding/public';
import { DashboardPanelStorage } from '../lib';

function makeDefaultServices(): DashboardAppServices {
  const core = coreMock.createStart();
  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.find = (search: string, sizeOrOptions: number | SavedObjectLoaderFindOptions) => {
    const size = typeof sizeOrOptions === 'number' ? sizeOrOptions : sizeOrOptions.size ?? 10;
    const hits = [];
    for (let i = 0; i < size; i++) {
      hits.push({
        id: `dashboard${i}`,
        title: `dashboard${i} - ${search} - title`,
        description: `dashboard${i} desc`,
      });
    }
    return Promise.resolve({
      total: size,
      hits,
    });
  };
  const dashboardPanelStorage = ({
    getDashboardIdsWithUnsavedChanges: jest
      .fn()
      .mockResolvedValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
  } as unknown) as DashboardPanelStorage;

  return {
    savedObjects: savedObjectsPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createInstance().doStart(),
    dashboardCapabilities: {} as DashboardCapabilities,
    initializerContext: {} as PluginInitializerContext,
    chrome: chromeServiceMock.createStartContract(),
    navigation: {} as NavigationPublicPluginStart,
    savedObjectsClient: core.savedObjects.client,
    data: dataPluginMock.createStartContract(),
    indexPatterns: {} as IndexPatternsContract,
    scopedHistory: () => ({} as ScopedHistory),
    savedQueryService: {} as SavedQueryService,
    setHeaderActionMenu: (mountPoint) => {},
    urlForwarding: {} as UrlForwardingStart,
    uiSettings: {} as IUiSettingsClient,
    restorePreviousUrl: () => {},
    onAppLeave: (handler) => {},
    allowByValueEmbeddables: true,
    dashboardPanelStorage,
    savedDashboards,
    core,
    visualizations: visualizationsPluginMock.createStartContract(),
  };
}

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

  test('hideWriteControls', async () => {
    const services = makeDefaultServices();
    services.dashboardCapabilities.hideWriteControls = true;
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
