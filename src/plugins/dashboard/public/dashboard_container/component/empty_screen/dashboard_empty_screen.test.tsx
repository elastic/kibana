/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

import { buildMockDashboard } from '../../../mocks';
import { DashboardEmptyScreen } from './dashboard_empty_screen';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardContainerContext } from '../../embeddable/dashboard_container';
import { ViewMode } from '@kbn/embeddable-plugin/public';

pluginServices.getServices().visualizations.getAliases = jest
  .fn()
  .mockReturnValue([{ name: 'lens' }]);

describe('DashboardEmptyScreen', () => {
  function mountComponent(viewMode: ViewMode) {
    const dashboardContainer = buildMockDashboard({ overrides: { viewMode } });
    return mountWithIntl(
      <DashboardContainerContext.Provider value={dashboardContainer}>
        <DashboardEmptyScreen />
      </DashboardContainerContext.Provider>
    );
  }

  test('renders correctly with view mode', () => {
    const component = mountComponent(ViewMode.VIEW);
    expect(component.render()).toMatchSnapshot();

    const emptyReadWrite = findTestSubject(component, 'dashboardEmptyReadWrite');
    expect(emptyReadWrite.length).toBe(1);
    const emptyReadOnly = findTestSubject(component, 'dashboardEmptyReadOnly');
    expect(emptyReadOnly.length).toBe(0);
    const editingPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(editingPanel.length).toBe(0);
  });

  test('renders correctly with edit mode', () => {
    const component = mountComponent(ViewMode.EDIT);
    expect(component.render()).toMatchSnapshot();

    const emptyReadWrite = findTestSubject(component, 'dashboardEmptyReadWrite');
    expect(emptyReadWrite.length).toBe(0);
    const emptyReadOnly = findTestSubject(component, 'dashboardEmptyReadOnly');
    expect(emptyReadOnly.length).toBe(0);
    const editingPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(editingPanel.length).toBe(1);
  });

  test('renders correctly with readonly mode', () => {
    pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

    const component = mountComponent(ViewMode.VIEW);
    expect(component.render()).toMatchSnapshot();

    const emptyReadWrite = findTestSubject(component, 'dashboardEmptyReadWrite');
    expect(emptyReadWrite.length).toBe(0);
    const emptyReadOnly = findTestSubject(component, 'dashboardEmptyReadOnly');
    expect(emptyReadOnly.length).toBe(1);
    const editingPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(editingPanel.length).toBe(0);
  });

  // even when in edit mode, readonly users should not have access to the editing buttons in the empty prompt.
  test('renders correctly with readonly and edit mode', () => {
    pluginServices.getServices().dashboardCapabilities.showWriteControls = false;

    const component = mountComponent(ViewMode.EDIT);
    expect(component.render()).toMatchSnapshot();

    const emptyReadWrite = findTestSubject(component, 'dashboardEmptyReadWrite');
    expect(emptyReadWrite.length).toBe(0);
    const emptyReadOnly = findTestSubject(component, 'dashboardEmptyReadOnly');
    expect(emptyReadOnly.length).toBe(1);
    const editingPanel = findTestSubject(component, 'emptyDashboardWidget');
    expect(editingPanel.length).toBe(0);
  });
});
