/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MemoryHistory, createMemoryHistory } from 'history';
import React, { useEffect } from 'react';

import { render, waitFor } from '@testing-library/react';

import { DashboardApi } from '..';
import type { DashboardRendererProps } from '../dashboard_container/external_api/dashboard_renderer';
import { LazyDashboardRenderer } from '../dashboard_container/external_api/lazy_dashboard_renderer';
import { DashboardTopNav } from '../dashboard_top_nav';
import { buildMockDashboard } from '../mocks';
import { dataService } from '../services/kibana_services';
import { DashboardApp } from './dashboard_app';

jest.mock('../dashboard_container/external_api/lazy_dashboard_renderer');
jest.mock('../dashboard_top_nav');

describe('Dashboard App', () => {
  dataService.query.filterManager.getFilters = jest.fn().mockImplementation(() => []);

  const mockDashboard = buildMockDashboard();
  let mockHistory: MemoryHistory;
  // this is in url_utils dashboardApi expandedPanel subscription
  let historySpy: jest.SpyInstance;
  // this is in the dashboard app for the renderer when provided an expanded panel id
  const expandPanelSpy = jest.spyOn(mockDashboard, 'expandPanel');

  beforeAll(() => {
    mockHistory = createMemoryHistory();
    historySpy = jest.spyOn(mockHistory, 'replace');

    /**
     * Mock the DashboardTopNav + LazyDashboardRenderer component to avoid rendering the actual dashboard
     * and hitting errors that aren't relevant
     */
    (DashboardTopNav as jest.Mock).mockImplementation(() => <>Top nav</>);
    (LazyDashboardRenderer as jest.Mock).mockImplementation(
      ({ onApiAvailable }: DashboardRendererProps) => {
        // we need overwrite the onApiAvailable prop to get access to the dashboard API in this test
        useEffect(() => {
          onApiAvailable?.(mockDashboard as DashboardApi);
        }, [onApiAvailable]);

        return <div>Test renderer</div>;
      }
    );
  });

  beforeEach(() => {
    // reset the spies before each test
    expandPanelSpy.mockClear();
    historySpy.mockClear();
  });

  it('test the default behavior without an expandedPanel id passed as a prop to the DashboardApp', async () => {
    render(<DashboardApp redirectTo={jest.fn()} history={mockHistory} />);

    await waitFor(() => {
      expect(expandPanelSpy).not.toHaveBeenCalled();
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
    render(<DashboardApp redirectTo={jest.fn()} history={mockHistory} expandedPanelId="456" />);

    await waitFor(() => {
      expect(expandPanelSpy).toHaveBeenCalledTimes(1);
      expect(historySpy).toHaveBeenCalledTimes(0);
    });

    // simulate minimizing a panel
    mockDashboard.expandedPanelId.next(undefined);

    await waitFor(() => {
      expect(mockDashboard.expandedPanelId.getValue()).toBe(undefined);
      expect(historySpy).toHaveBeenCalledTimes(1);
      expect(mockHistory.location.pathname).toBe('/create');
    });
  });
});
