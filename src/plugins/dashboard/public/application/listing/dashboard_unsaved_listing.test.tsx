/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';
import { DashboardSavedObject } from '../..';
import { coreMock } from '../../../../../core/public/mocks';
import { KibanaContextProvider } from '../../services/kibana_react';
import { SavedObjectLoader } from '../../services/saved_objects';
import { DashboardPanelStorage } from '../lib';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_panel_storage';
import { DashboardAppServices, DashboardRedirect } from '../types';
import { DashboardUnsavedListing } from './dashboard_unsaved_listing';

const mockedDashboards: { [key: string]: DashboardSavedObject } = {
  dashboardUnsavedOne: {
    id: `dashboardUnsavedOne`,
    title: `Dashboard Unsaved One`,
  } as DashboardSavedObject,
  dashboardUnsavedTwo: {
    id: `dashboardUnsavedTwo`,
    title: `Dashboard Unsaved Two`,
  } as DashboardSavedObject,
  dashboardUnsavedThree: {
    id: `dashboardUnsavedThree`,
    title: `Dashboard Unsaved Three`,
  } as DashboardSavedObject,
};

function makeDefaultServices(): DashboardAppServices {
  const core = coreMock.createStart();
  core.overlays.openConfirm = jest.fn().mockResolvedValue(true);
  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.get = jest.fn().mockImplementation((id: string) => mockedDashboards[id]);
  const dashboardPanelStorage = {} as DashboardPanelStorage;
  dashboardPanelStorage.clearPanels = jest.fn();
  dashboardPanelStorage.getDashboardIdsWithUnsavedChanges = jest
    .fn()
    .mockImplementation(() => [
      'dashboardUnsavedOne',
      'dashboardUnsavedTwo',
      'dashboardUnsavedThree',
    ]);
  return ({
    dashboardPanelStorage,
    savedDashboards,
    core,
  } as unknown) as DashboardAppServices;
}

const makeDefaultProps = () => ({ redirectTo: jest.fn() });

function mountWith({
  services: incomingServices,
  props: incomingProps,
}: {
  services?: DashboardAppServices;
  props?: { redirectTo: DashboardRedirect };
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
  const component = mount(<DashboardUnsavedListing {...props} />, { wrappingComponent });
  return { component, props, services };
}

describe('Unsaved listing', () => {
  it('Gets information for each unsaved dashboard', async () => {
    const { services } = mountWith({});
    await waitFor(() => {
      expect(services.savedDashboards.get).toHaveBeenCalledTimes(3);
    });
  });

  it('Does not attempt to get unsaved dashboard id', async () => {
    const services = makeDefaultServices();
    services.dashboardPanelStorage.getDashboardIdsWithUnsavedChanges = jest
      .fn()
      .mockImplementation(() => ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID]);
    mountWith({ services });
    await waitFor(() => {
      expect(services.savedDashboards.get).toHaveBeenCalledTimes(1);
    });
  });

  it('Redirects to the requested dashboard in edit mode when continue editing clicked', async () => {
    const { props, component } = mountWith({});
    const getEditButton = () => findTestSubject(component, 'edit-unsaved-dashboardUnsavedOne');
    await waitFor(() => {
      component.update();
      expect(getEditButton().length).toEqual(1);
    });
    getEditButton().simulate('click');
    expect(props.redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: 'dashboardUnsavedOne',
      editMode: true,
    });
  });

  it('Redirects to new dashboard when continue editing clicked', async () => {
    const services = makeDefaultServices();
    services.dashboardPanelStorage.getDashboardIdsWithUnsavedChanges = jest
      .fn()
      .mockImplementation(() => [DASHBOARD_PANELS_UNSAVED_ID]);
    const { props, component } = mountWith({ services });
    const getEditButton = () =>
      findTestSubject(component, `edit-unsaved-${DASHBOARD_PANELS_UNSAVED_ID}`);
    await waitFor(() => {
      component.update();
      expect(getEditButton().length).toBe(1);
    });
    getEditButton().simulate('click');
    expect(props.redirectTo).toHaveBeenCalledWith({
      destination: 'dashboard',
      id: undefined,
      editMode: true,
    });
  });

  it('Shows a warning then clears changes when delete unsaved changes is pressed', async () => {
    const { services, component } = mountWith({});
    const getDiscardButton = () =>
      findTestSubject(component, 'discard-unsaved-dashboardUnsavedOne');
    await waitFor(() => {
      component.update();
      expect(getDiscardButton().length).toBe(1);
    });
    getDiscardButton().simulate('click');
    waitFor(() => {
      component.update();
      expect(services.core.overlays.openConfirm).toHaveBeenCalled();
      expect(services.dashboardPanelStorage.clearPanels).toHaveBeenCalledWith(
        'dashboardUnsavedOne'
      );
    });
  });
});
