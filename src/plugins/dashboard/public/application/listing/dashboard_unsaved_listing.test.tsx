/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  savedDashboards.get = jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(mockedDashboards[id]));
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
    const getEditButton = () => findTestSubject(component, 'edit-unsaved-Dashboard-Unsaved-One');
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
    const getEditButton = () => findTestSubject(component, `edit-unsaved-New-Dashboard`);
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
      findTestSubject(component, 'discard-unsaved-Dashboard-Unsaved-One');
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

  it('removes unsaved changes from any dashboard which errors on fetch', async () => {
    const services = makeDefaultServices();
    services.savedDashboards.get = jest.fn().mockImplementation((id: string) => {
      if (id === 'failCase1' || id === 'failCase2') {
        return Promise.reject(new Error());
      }
      return Promise.resolve(mockedDashboards[id]);
    });

    services.dashboardPanelStorage.getDashboardIdsWithUnsavedChanges = jest
      .fn()
      .mockImplementation(() => [
        'dashboardUnsavedOne',
        'dashboardUnsavedTwo',
        'dashboardUnsavedThree',
        'failCase1',
        'failCase2',
      ]);
    const { component } = mountWith({ services });
    waitFor(() => {
      component.update();
      expect(services.dashboardPanelStorage.clearPanels).toHaveBeenCalledWith('failCase1');
      expect(services.dashboardPanelStorage.clearPanels).toHaveBeenCalledWith('failCase2');

      // clearing panels from dashboard with errors should cause getDashboardIdsWithUnsavedChanges to be called again.
      expect(
        services.dashboardPanelStorage.getDashboardIdsWithUnsavedChanges
      ).toHaveBeenCalledTimes(2);
    });
  });
});
