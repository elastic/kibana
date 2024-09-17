/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createMemoryHistory } from 'history';
import { DashboardApp } from './dashboard_app';
import { act, render, waitFor } from '@testing-library/react';
import { buildMockDashboard } from '../mocks';
import * as dashboardApiHelpers from '../dashboard_container/external_api/dashboard_api';

/* These tests circumvent the need to test the router and legacy code
/* the dashboard app will be passed the expanded panel id from the DashboardRouter through mountApp()
/* @link https://github.com/elastic/kibana/pull/190086/
*/
describe('Dashboard App', () => {
  let mockHistory: ReturnType<typeof createMemoryHistory>;
  let mockDashboard: ReturnType<typeof buildMockDashboard>;
  beforeEach(() => {
    /**
     * The buildMockDashboard function within the DashboardRenderer returns the DashboardAPI to the DashboardApp. The dashboard API is needed in the DashboardApp to see if the expandedPanelId BehaviorSubject is called
     * In this, we are mocking the buildApiFromDashboardContainer function to return the mockDashboard (dashboardAPI) and then have that accessible
     * for the test that renders the DashboardApp
     */
    act(() => {
      mockDashboard = buildMockDashboard();
      jest.spyOn(dashboardApiHelpers, 'buildApiFromDashboardContainer').mockImplementation(() => {
        return mockDashboard;
      });
      mockHistory = createMemoryHistory();
    });
  });

  it('test the default behavior without an expandedPanel id passed as a prop to the DashboardApp', async () => {
    const historySpy = jest.spyOn(mockHistory, 'replace');

    render(<DashboardApp savedDashboardId="" redirectTo={jest.fn()} history={mockHistory} />);

    await waitFor(() => {
      expect(historySpy).toHaveBeenCalledTimes(0);
      expect(mockHistory.location.pathname).toBe('/');
    });

    // mock maximized panel
    act(() => {
      mockDashboard.expandedPanelId.next('123');
    });

    expect(historySpy).toHaveBeenCalledTimes(1);
    expect(mockHistory.location.pathname).toBe('/create/123');
  });

  it('test that the expanded panel behavior subject and history is called when passed as a prop to the DashboardApp', async () => {
    const expandedPanelIdSpy = jest.spyOn(mockDashboard.expandedPanelId, 'next');
    const historySpy = jest.spyOn(mockHistory, 'replace');

    render(
      <DashboardApp
        savedDashboardId=""
        redirectTo={jest.fn()}
        history={mockHistory}
        expandedPanelId="456"
      />
    );

    await waitFor(() => {
      expect(expandedPanelIdSpy).toHaveBeenCalledTimes(1);
      expect(historySpy).toHaveBeenCalledTimes(0);
      // render a dashboard with an expanded panel initially,
      // react testing library limitation on showing the expanded panel subscription
      expect(expandedPanelIdSpy).toHaveBeenCalledWith('456');
    });

    // simulate minimizing a panel
    act(() => {
      mockDashboard.expandedPanelId.next(undefined);
    });

    expect(mockHistory.location.pathname).toBe('/create');
  });
});
