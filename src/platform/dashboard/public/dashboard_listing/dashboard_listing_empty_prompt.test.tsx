/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n-react';

import {
  DashboardListingEmptyPrompt,
  DashboardListingEmptyPromptProps,
} from './dashboard_listing_empty_prompt';
import { pluginServices } from '../services/plugin_services';
import { confirmDiscardUnsavedChanges } from './confirm_overlays';

jest.mock('./confirm_overlays', () => {
  const originalModule = jest.requireActual('./confirm_overlays');
  return {
    __esModule: true,
    ...originalModule,
    confirmDiscardUnsavedChanges: jest.fn(),
  };
});

const makeDefaultProps = (): DashboardListingEmptyPromptProps => ({
  createItem: jest.fn(),
  unsavedDashboardIds: [],
  goToDashboard: jest.fn(),
  setUnsavedDashboardIds: jest.fn(),
  useSessionStorageIntegration: true,
  disableCreateDashboardButton: false,
});

function mountWith({
  props: incomingProps,
}: {
  props?: Partial<DashboardListingEmptyPromptProps>;
}) {
  const props = { ...makeDefaultProps(), ...incomingProps };
  const wrappingComponent: React.FC<{
    children: React.ReactNode;
  }> = ({ children }) => {
    return <I18nProvider>{children}</I18nProvider>;
  };
  const component = mount(<DashboardListingEmptyPrompt {...props} />, { wrappingComponent });
  return { component, props };
}

test('renders readonly empty prompt when showWriteControls is off', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

  let component: ReactWrapper;
  await act(async () => {
    ({ component } = mountWith({}));
  });

  component!.update();
  expect(component!.find('EuiLink').length).toBe(0);
});

test('renders empty prompt with link when showWriteControls is on', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = true;

  let component: ReactWrapper;
  await act(async () => {
    ({ component } = mountWith({}));
  });

  component!.update();
  expect(component!.find('EuiLink').length).toBe(1);
});

test('renders disabled action button when disableCreateDashboardButton is true', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = true;

  let component: ReactWrapper;
  await act(async () => {
    ({ component } = mountWith({ props: { disableCreateDashboardButton: true } }));
  });

  component!.update();

  expect(component!.find(`[data-test-subj="newItemButton"]`).first().prop('disabled')).toEqual(
    true
  );
});

test('renders continue button when no dashboards exist but one is in progress', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = true;
  let component: ReactWrapper;
  let props: DashboardListingEmptyPromptProps;
  await act(async () => {
    ({ component, props } = mountWith({
      props: { unsavedDashboardIds: ['newDashboard'], useSessionStorageIntegration: true },
    }));
  });
  component!.update();
  await act(async () => {
    // EuiButton is used for the Continue button
    const continueButton = component!.find('EuiButton');
    expect(continueButton.length).toBe(1);
    continueButton.find('button').simulate('click');
  });
  expect(props!.goToDashboard).toHaveBeenCalled();
});

test('renders discard button when no dashboards exist but one is in progress', async () => {
  pluginServices.getServices().dashboardCapabilities.showWriteControls = true;
  let component: ReactWrapper;
  await act(async () => {
    ({ component } = mountWith({
      props: { unsavedDashboardIds: ['coolId'], useSessionStorageIntegration: true },
    }));
  });
  component!.update();
  await act(async () => {
    // EuiButtonEmpty is used for the discard button
    component!.find('EuiButtonEmpty').simulate('click');
  });
  expect(confirmDiscardUnsavedChanges).toHaveBeenCalled();
});
