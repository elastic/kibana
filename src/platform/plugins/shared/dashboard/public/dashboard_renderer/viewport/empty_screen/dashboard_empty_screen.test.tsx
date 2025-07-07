/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import { DashboardApi } from '../../../dashboard_api/types';
import { coreServices } from '../../../services/kibana_services';
import { DashboardEmptyScreen } from './dashboard_empty_screen';
import { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';

describe('DashboardEmptyScreen', () => {
  function renderComponent(viewMode: ViewMode) {
    const mockDashboardApi = {
      viewMode$: new BehaviorSubject<ViewMode>(viewMode),
    } as unknown as DashboardApi;
    return render(
      <DashboardContext.Provider value={mockDashboardApi}>
        <DashboardEmptyScreen />
      </DashboardContext.Provider>
    );
  }

  beforeEach(() => {
    // Reset capabilities before each test
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;
  });

  test('renders correctly with view mode', () => {
    renderComponent('view');

    expect(screen.getByTestId('dashboardEmptyReadWrite')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with edit mode', () => {
    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(screen.getByTestId('emptyDashboardWidget')).toBeInTheDocument();
  });

  test('renders correctly with readonly mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;

    renderComponent('view');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with readonly and edit mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;

    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });
});
