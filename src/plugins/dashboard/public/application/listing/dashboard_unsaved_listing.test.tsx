/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import React from 'react';

import { DashboardSavedObject } from '../..';
import { DashboardAppServices } from '../../types';
import { SavedObjectLoader } from '../../services/saved_objects';
import { KibanaContextProvider } from '../../services/kibana_react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_session_storage';
import { DashboardUnsavedListing, DashboardUnsavedListingProps } from './dashboard_unsaved_listing';
import { makeDefaultServices } from '../test_helpers';

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

function makeServices(): DashboardAppServices {
  const services = makeDefaultServices();
  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.get = jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(mockedDashboards[id]));
  return {
    ...services,
    savedDashboards,
  };
}

const makeDefaultProps = (): DashboardUnsavedListingProps => ({
  redirectTo: jest.fn(),
  unsavedDashboardIds: ['dashboardUnsavedOne', 'dashboardUnsavedTwo', 'dashboardUnsavedThree'],
  refreshUnsavedDashboards: jest.fn(),
});

function mountWith({
  services: incomingServices,
  props: incomingProps,
}: {
  services?: DashboardAppServices;
  props?: DashboardUnsavedListingProps;
}) {
  const services = incomingServices ?? makeServices();
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
    const props = makeDefaultProps();
    props.unsavedDashboardIds = ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID];
    const { services } = mountWith({ props });
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
    const props = makeDefaultProps();
    props.unsavedDashboardIds = [DASHBOARD_PANELS_UNSAVED_ID];
    const { component } = mountWith({ props });
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
      expect(services.dashboardSessionStorage.clearState).toHaveBeenCalledWith(
        'dashboardUnsavedOne'
      );
    });
  });

  it('removes unsaved changes from any dashboard which errors on fetch', async () => {
    const services = makeServices();
    const props = makeDefaultProps();
    services.savedDashboards.get = jest.fn().mockImplementation((id: string) => {
      if (id === 'failCase1' || id === 'failCase2') {
        return Promise.reject(new Error());
      }
      return Promise.resolve(mockedDashboards[id]);
    });

    props.unsavedDashboardIds = [
      'dashboardUnsavedOne',
      'dashboardUnsavedTwo',
      'dashboardUnsavedThree',
      'failCase1',
      'failCase2',
    ];
    const { component } = mountWith({ services, props });
    waitFor(() => {
      component.update();
      expect(services.dashboardSessionStorage.clearState).toHaveBeenCalledWith('failCase1');
      expect(services.dashboardSessionStorage.clearState).toHaveBeenCalledWith('failCase2');

      // clearing panels from dashboard with errors should cause getDashboardIdsWithUnsavedChanges to be called again.
      expect(
        services.dashboardSessionStorage.getDashboardIdsWithUnsavedChanges
      ).toHaveBeenCalledTimes(2);
    });
  });
});
