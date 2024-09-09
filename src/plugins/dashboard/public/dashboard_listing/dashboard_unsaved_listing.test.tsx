/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mount, ComponentType } from 'enzyme';

import { I18nProvider } from '@kbn/i18n-react';
import { waitFor } from '@testing-library/react';
import { findTestSubject } from '@elastic/eui/lib/test';

import { pluginServices } from '../services/plugin_services';
import { DashboardUnsavedListing, DashboardUnsavedListingProps } from './dashboard_unsaved_listing';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../services/dashboard_backup/dashboard_backup_service';
import { ViewMode } from '@kbn/embeddable-plugin/public';

const makeDefaultProps = (): DashboardUnsavedListingProps => ({
  goToDashboard: jest.fn(),
  unsavedDashboardIds: ['dashboardUnsavedOne', 'dashboardUnsavedTwo', 'dashboardUnsavedThree'],
  refreshUnsavedDashboards: jest.fn(),
});

function mountWith({ props: incomingProps }: { props?: Partial<DashboardUnsavedListingProps> }) {
  const props = { ...makeDefaultProps(), ...incomingProps };
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return <I18nProvider>{children}</I18nProvider>;
  };
  const component = mount(<DashboardUnsavedListing {...props} />, {
    wrappingComponent: wrappingComponent as ComponentType<{}>,
  });
  return { component, props };
}

describe('Unsaved listing', () => {
  it('Gets information for each unsaved dashboard', async () => {
    mountWith({});
    await waitFor(() => {
      expect(
        pluginServices.getServices().dashboardContentManagement.findDashboards.findByIds
      ).toHaveBeenCalledTimes(1);
    });
  });

  it('Does not attempt to get newly created dashboard', async () => {
    const props = makeDefaultProps();
    props.unsavedDashboardIds = ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID];
    mountWith({ props });
    await waitFor(() => {
      expect(
        pluginServices.getServices().dashboardContentManagement.findDashboards.findByIds
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
    expect(props.goToDashboard).toHaveBeenCalledWith('dashboardUnsavedOne', ViewMode.EDIT);
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
    expect(props.goToDashboard).toHaveBeenCalledWith(undefined, ViewMode.EDIT);
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
      expect(pluginServices.getServices().dashboardBackup.clearState).toHaveBeenCalledWith(
        'dashboardUnsavedOne'
      );
    });
  });

  it('removes unsaved changes from any dashboard which errors on fetch', async () => {
    (
      pluginServices.getServices().dashboardContentManagement.findDashboards.findByIds as jest.Mock
    ).mockResolvedValue([
      {
        id: 'failCase1',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 404 },
      },
      {
        id: 'failCase2',
        status: 'error',
        error: { error: 'oh no', message: 'bwah', statusCode: 404 },
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
      expect(pluginServices.getServices().dashboardBackup.clearState).toHaveBeenCalledWith(
        'failCase1'
      );
      expect(pluginServices.getServices().dashboardBackup.clearState).toHaveBeenCalledWith(
        'failCase2'
      );

      // clearing panels from dashboard with errors should cause getDashboardIdsWithUnsavedChanges to be called again.
      expect(
        pluginServices.getServices().dashboardBackup.getDashboardIdsWithUnsavedChanges
      ).toHaveBeenCalledTimes(2);
    });
  });
});
