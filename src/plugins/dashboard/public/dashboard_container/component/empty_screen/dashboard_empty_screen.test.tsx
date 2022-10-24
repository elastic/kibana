/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { pluginServices } from '../../../services/plugin_services';
import { DashboardEmptyScreen, DashboardEmptyScreenProps } from './dashboard_empty_screen';

describe('DashboardEmptyScreen', () => {
  const DashboardServicesProvider = pluginServices.getContextProvider();

  const defaultProps = {
    onLinkClick: jest.fn(),
  };

  function mountComponent(props?: Partial<DashboardEmptyScreenProps>) {
    const compProps = { ...defaultProps, ...props };
    return mountWithIntl(
      <DashboardServicesProvider>
        <DashboardEmptyScreen {...compProps} />
      </DashboardServicesProvider>
    );
  }

  test('renders correctly with view mode', () => {
    const component = mountComponent();
    expect(component.render()).toMatchSnapshot();
    const enterEditModeParagraph = component.find('.dshStartScreen__panelDesc');
    expect(enterEditModeParagraph.length).toBe(1);
  });

  test('renders correctly with edit mode', () => {
    const component = mountComponent({ isEditMode: true });
    expect(component.render()).toMatchSnapshot();
    const paragraph = component.find('.dshStartScreen__panelDesc');
    expect(paragraph.length).toBe(0);
    const emptyPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(emptyPanel.length).toBe(1);
  });

  test('renders correctly with readonly mode', () => {
    pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

    const component = mountComponent();
    expect(component.render()).toMatchSnapshot();
    const paragraph = component.find('.dshStartScreen__panelDesc');
    expect(paragraph.length).toBe(0);
    const emptyPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(emptyPanel.length).toBe(0);
  });
});
