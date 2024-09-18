/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React, { useEffect } from 'react';
import type { DashboardRendererProps } from '../dashboard_container/external_api/dashboard_renderer';
import { buildMockDashboard } from '../mocks';
import { DashboardApp } from './dashboard_app';
import { DashboardApi } from '..';

import * as dashboardRendererStuff from '../dashboard_container/external_api/lazy_dashboard_renderer';

/* These tests circumvent the need to test the router and legacy code
/* the dashboard app will be passed the expanded panel id from the DashboardRouter through mountApp()
/* @link https://github.com/elastic/kibana/pull/190086/
*/

describe('Dashboard App', () => {
  const mockDashboard = buildMockDashboard();
  const mockHistory = createMemoryHistory();
  const historySpy = jest.spyOn(mockHistory, 'replace');

  beforeAll(() => {
    jest
      .spyOn(dashboardRendererStuff, 'LazyDashboardRenderer')
      .mockImplementation(({ onApiAvailable }: DashboardRendererProps) => {
        useEffect(() => {
          onApiAvailable?.(mockDashboard as DashboardApi);
        }, [onApiAvailable]);

        return <div>Test renderer</div>;
      });
  });

  beforeEach(() => {
    historySpy.mockClear();
  });

  it('test the default behavior without an expandedPanel id passed as a prop to the DashboardApp', async () => {
    render(<DashboardApp redirectTo={jest.fn()} history={mockHistory} />);

    await waitFor(() => {
      expect(mockDashboard.expandedPanelId.getValue()).toBe(undefined);
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

  // it.skip('test that the expanded panel behavior subject and history is called when passed as a prop to the DashboardApp', async () => {
  //   const expandedPanelIdSpy = jest.spyOn(mockDashboard.expandedPanelId, 'next');
  //   const historySpy = jest.spyOn(mockHistory, 'replace');

  //   render(
  //     <DashboardApp
  //       savedDashboardId=""
  //       redirectTo={jest.fn()}
  //       history={mockHistory}
  //       expandedPanelId="456"
  //     />
  //   );

  //   await waitFor(() => {
  //     expect(expandedPanelIdSpy).toHaveBeenCalledTimes(1);
  //     expect(historySpy).toHaveBeenCalledTimes(0);
  //     // render a dashboard with an expanded panel initially,
  //     // react testing library limitation on showing the expanded panel subscription
  //     // expect(expandedPanelIdSpy).toHaveBeenCalledWith('456');
  //   });

  //   // // simulate minimizing a panel
  //   // act(() => {
  //   //   mockDashboard.expandedPanelId.next(undefined);
  //   // });

  //   // expect(mockHistory.location.pathname).toBe('/create');
  // });
});
