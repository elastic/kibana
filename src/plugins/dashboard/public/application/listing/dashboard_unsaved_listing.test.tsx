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

import { DashboardAppServices } from '../../types';
import { KibanaContextProvider } from '../../services/kibana_react';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_session_storage';
import { DashboardUnsavedListing, DashboardUnsavedListingProps } from './dashboard_unsaved_listing';
import { makeDefaultServices } from '../test_helpers';
import { DashboardAttributes } from '../embeddable';

import * as findDashboardSavedObjects from '../../dashboard_saved_object/find_dashboard_saved_objects';

const mockedDashboardResults: Awaited<
  ReturnType<typeof findDashboardSavedObjects.findDashboardSavedObjectsByIds>
> = [
  {
    id: `dashboardUnsavedOne`,
    status: 'success',
    attributes: {
      title: `Dashboard Unsaved One`,
    } as unknown as DashboardAttributes,
  },
  {
    id: `dashboardUnsavedTwo`,
    status: 'success',
    attributes: {
      title: `Dashboard Unsaved Two`,
    } as unknown as DashboardAttributes,
  },
  {
    id: `dashboardUnsavedThree`,
    status: 'success',
    attributes: {
      title: `Dashboard Unsaved Three`,
    } as unknown as DashboardAttributes,
  },
];

jest
  .spyOn(findDashboardSavedObjects, 'findDashboardSavedObjectsByIds')
  .mockImplementation((savedObjectsClient: unknown, ids: string[]) =>
    Promise.resolve(mockedDashboardResults)
  );

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
    mountWith({});
    await waitFor(() => {
      expect(findDashboardSavedObjects.findDashboardSavedObjectsByIds).toHaveBeenCalledTimes(1);
    });
  });

  it('Does not attempt to get newly created dashboard', async () => {
    const props = makeDefaultProps();
    props.unsavedDashboardIds = ['dashboardUnsavedOne', DASHBOARD_PANELS_UNSAVED_ID];
    mountWith({ props });
    await waitFor(() => {
      expect(findDashboardSavedObjects.findDashboardSavedObjectsByIds).toHaveBeenCalledWith(
        expect.any(Object),
        ['dashboardUnsavedOne']
      );
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
    const props = makeDefaultProps();
    jest
      .spyOn(findDashboardSavedObjects, 'findDashboardSavedObjectsByIds')
      .mockImplementation((savedObjectsClient: unknown, ids: string[]) =>
        Promise.resolve([
          ...mockedDashboardResults,
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
        ])
      );

    props.unsavedDashboardIds = [
      'dashboardUnsavedOne',
      'dashboardUnsavedTwo',
      'dashboardUnsavedThree',
      'failCase1',
      'failCase2',
    ];
    const { component, services } = mountWith({ props });
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
