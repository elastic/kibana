/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import { MemoryHistory, createMemoryHistory } from 'history';
import React, { useEffect } from 'react';
import type { DashboardRendererProps } from '../dashboard_container/external_api/dashboard_renderer';
import { buildMockDashboard } from '../mocks';
import { DashboardApp } from './dashboard_app';

import * as dashboardRendererStuff from '../dashboard_container/external_api/lazy_dashboard_renderer';
import { DashboardApi } from '..';

/* These tests circumvent the need to test the router and legacy code
/* the dashboard app will be passed the expanded panel id from the DashboardRouter through mountApp()
/* @link https://github.com/elastic/kibana/pull/190086/
*/

describe('Dashboard App', () => {
  const mockDashboard = buildMockDashboard();
  const expandedPanelIdSpy = jest.spyOn(mockDashboard.expandedPanelId, 'next');
  let mockHistory: MemoryHistory;
  let historySpy: jest.SpyInstance;

  beforeEach(() => {
    mockHistory = createMemoryHistory();
    historySpy = jest.spyOn(mockHistory, 'replace');

    /**
     * Mock the LazyDashboardRenderer component to avoid rendering the actual dashboard
     * and hitting errors that aren't relevant
     */
    jest
      .spyOn(dashboardRendererStuff, 'LazyDashboardRenderer')
      // we need overwrite the onApiAvailable prop to get the dashboard Api in the dashboard app
      .mockImplementation(({ onApiAvailable }: DashboardRendererProps) => {
        useEffect(() => {
          onApiAvailable?.(mockDashboard as DashboardApi);
        }, [onApiAvailable]);

        return <div>Test renderer</div>;
      });

    // reset the mock history calls per test
    historySpy.mockClear();
    // reset the expanded panel id between tests
    expandedPanelIdSpy.mockClear();
  });

  it('test the default behavior without an expandedPanel id passed as a prop to the DashboardApp', async () => {
    // default conditions with no expanded panel id and no urls being passed with expanded panel ID in the url
    render(<DashboardApp redirectTo={jest.fn()} history={mockHistory} />);

    await waitFor(() => {
      // this value should be undefined by default
      expect(mockDashboard.expandedPanelId.getValue()).toBe(undefined);
      // history should not be called
      expect(historySpy).toHaveBeenCalledTimes(0);
      expect(mockHistory.location.pathname).toBe('/');
    });

    // simulate expanding a panel
    mockDashboard.expandPanel('123');

    await waitFor(() => {
      expect(mockDashboard.expandedPanelId.getValue()).toBe('123');
      expect(historySpy).toHaveBeenCalledTimes(1);
      expect(mockHistory.location.pathname).toBe('/create/123');
    });
  });

  it('test that the expanded panel behavior subject and history is called when passed as a prop to the DashboardApp', async () => {
    // this tests a user getting a url from another user that has an expanded panel on the dashboard
    // test someone giving a url with an expanded panel id, as if it goes through the router
    mockHistory.push('/create/456');

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
      // history replace should not be called until minimizing the panel
      expect(historySpy).toHaveBeenCalledTimes(0);
      expect(mockDashboard.getExpandedPanelId());
      expect(mockHistory.location.pathname).toBe('/create/456');
    });

    // simulate minimizing a panel
    mockDashboard.expandedPanelId.next(undefined);
    expect(historySpy).toHaveBeenCalledTimes(1);
    expect(mockHistory.location.pathname).toBe('/create');
  });
});
