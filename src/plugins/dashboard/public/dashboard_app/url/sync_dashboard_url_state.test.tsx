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
import { mountApp } from '../dashboard_router';
import { createCoreStartMock } from '@kbn/core-lifecycle-browser-mocks/src/core_start.mock';
import { CoreScopedHistory } from '@kbn/core-application-browser-internal';
import { act } from 'react-dom/test-utils';
import { render } from 'enzyme';
import { DashboardApp } from '../dashboard_app';
import { KibanaErrorBoundary, KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';

describe('Sync Dashboard URL State', () => {
  it('default behavior: should show expanded panel undefined if provided undefined from the router', async () => {
    const getPageParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const dashboardId = searchParams.get('dashboardId');
      const expandedPanelId = searchParams.get('expandedPanelId');
      return [dashboardId, expandedPanelId];
    };
    const mockHistory = new CoreScopedHistory(createMemoryHistory(), '/');

    const mockCoreStart = createCoreStartMock();
    const mockContext = {
      restorePreviousUrl: jest.fn(),
      onAppLeave: jest.fn(),
      setHeaderActionMenu: jest.fn(),
    };
    const mockEmbedSettings = {};
    const mockSavedDashboardId = '1';
    const mockRedirectTo = jest.fn();
    const mockExpandedPanelId = 'test';
    const container = document.createElement('div');

    act(() => {
      mountApp({
        coreStart: mockCoreStart,
        mountContext: { ...mockContext, scopedHistory: () => mockHistory },
        appUnMounted: jest.fn(),
        element: container,
      });
      render(
        <KibanaErrorBoundaryProvider analytics={analyticsServiceMock.createAnalyticsServiceStart()}>
          <KibanaErrorBoundary>
            <DashboardApp history={mockHistory} redirectTo={jest.fn()} savedDashboardId="1" />
          </KibanaErrorBoundary>
        </KibanaErrorBoundaryProvider>
      );
    });

    expect(getPageParams()).toEqual(['1', undefined]);
  });
});
