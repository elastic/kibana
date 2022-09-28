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
import { waitFor } from '@testing-library/react';
import { findTestSubject } from '@elastic/eui/lib/test';

import { DashboardUnsavedListing, DashboardUnsavedListingProps } from './dashboard_unsaved_listing';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../../services/dashboard_session_storage/dashboard_session_storage_service';
import { pluginServices } from '../../services/plugin_services';

const makeDefaultProps = (): DashboardUnsavedListingProps => ({
  redirectTo: jest.fn(),
  unsavedDashboardIds: ['dashboardUnsavedOne', 'dashboardUnsavedTwo', 'dashboardUnsavedThree'],
  refreshUnsavedDashboards: jest.fn(),
});

function mountWith({ props: incomingProps }: { props?: DashboardUnsavedListingProps }) {
  const props = incomingProps ?? makeDefaultProps();
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return <I18nProvider>{children}</I18nProvider>;
  };
  const component = mount(<DashboardUnsavedListing {...props} />, { wrappingComponent });
  return { component, props };
}

describe('Unsaved listing', () => {
  it('Gets information for each unsaved dashboard', async () => {
    mountWith({});
    await waitFor(() => {
      expect(
        pluginServices.getServices().dashboardSavedObject.findDashboards.findByIds
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('Does not attempt to get newly created dashboard', async () => {
    const props = makeDefaultProps();
    props.unsavedDashboardIds = ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID];
    mountWith({ props });
    await waitFor(() => {
      expect(
        pluginServices.getServices().dashboardSavedObject.findDashboards.findByIds
      ).toHaveBeenCalledWith(['dashboardUnsavedOne']);
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
    const { component } = mountWith({});
    const getDiscardButton = () =>
      findTestSubject(component, 'discard-unsaved-Dashboard-Unsaved-One');
    await waitFor(() => {
      component.update();
      expect(getDiscardButton().length).toBe(1);
    });
    getDiscardButton().simulate('click');
    waitFor(() => {
      component.update();
      expect(pluginServices.getServices().overlays.openConfirm).toHaveBeenCalled();
      expect(pluginServices.getServices().dashboardSessionStorage.clearState).toHaveBeenCalledWith(
        'dashboardUnsavedOne'
      );
    });
  });

  it('removes unsaved changes from any dashboard which errors on fetch', async () => {
    (
      pluginServices.getServices().dashboardSavedObject.findDashboards.findByIds as jest.Mock
    ).mockResolvedValue([
      {
        id: 'failCase1',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 100 },
      },
      {
        id: 'failCase2',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 100 },
      },
    ]);

    const props = makeDefaultProps();

    props.unsavedDashboardIds = [
      'dashboardUnsavedOne',
      'dashboardUnsavedTwo',
      'dashboardUnsavedThree',
      'failCase1',
      'failCase2',
    ];
    const { component } = mountWith({ props });
    waitFor(() => {
      component.update();
      expect(pluginServices.getServices().dashboardSessionStorage.clearState).toHaveBeenCalledWith(
        'failCase1'
      );
      expect(pluginServices.getServices().dashboardSessionStorage.clearState).toHaveBeenCalledWith(
        'failCase2'
      );

      // clearing panels from dashboard with errors should cause getDashboardIdsWithUnsavedChanges to be called again.
      expect(
        pluginServices.getServices().dashboardSessionStorage.getDashboardIdsWithUnsavedChanges
      ).toHaveBeenCalledTimes(2);
    });
  });
});
