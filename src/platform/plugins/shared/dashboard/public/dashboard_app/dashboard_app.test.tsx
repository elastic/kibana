/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import type { DashboardRendererProps } from '../dashboard_renderer/dashboard_renderer';
import { DashboardRenderer } from '../dashboard_renderer/dashboard_renderer';
import { DashboardTopNav } from '../dashboard_top_nav';
import { buildMockDashboardApi } from '../mocks';
import { DashboardApp } from './dashboard_app';
import { embeddableService } from '../services/kibana_services';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { createEmbeddableStateTransferMock } from '@kbn/embeddable-plugin/public/mocks';

jest.mock('../dashboard_renderer/dashboard_renderer');
jest.mock('../dashboard_top_nav');

describe('DashboardApp', () => {
  describe('expandedPanelId', () => {
    const {
      api: dashboardApi,
      internalApi: dashboardInternalApi,
      cleanup,
    } = buildMockDashboardApi();
    let mockHistory: MemoryHistory;
    // this is in url_utils dashboardApi expandedPanel subscription
    let historySpy: jest.SpyInstance;
    // this is in the dashboard app for the renderer when provided an expanded panel id
    const expandPanelSpy = jest.spyOn(dashboardApi, 'expandPanel');

    beforeAll(() => {
      mockHistory = createMemoryHistory();
      historySpy = jest.spyOn(mockHistory, 'replace');

      /**
       * Mock the DashboardTopNav + LazyDashboardRenderer component to avoid rendering the actual dashboard
       * and hitting errors that aren't relevant
       */
      (DashboardTopNav as jest.Mock).mockImplementation(() => <>Top nav</>);
      (DashboardRenderer as jest.Mock).mockImplementation(
        ({ onApiAvailable }: DashboardRendererProps) => {
          // we need overwrite the onApiAvailable prop to get access to the dashboard API in this test
          useEffect(() => {
            onApiAvailable?.(dashboardApi, dashboardInternalApi);
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

    afterAll(() => {
      cleanup();
    });

    it('should not expand panel when expandedPanelId is not provided', async () => {
      render(
        <DashboardApp redirectTo={jest.fn()} history={mockHistory} setDashboardAppApi={jest.fn()} />
      );

      await waitFor(() => {
        expect(expandPanelSpy).not.toHaveBeenCalled();
        // this value should be undefined by default
        expect(dashboardApi.expandedPanelId$.getValue()).toBe(undefined);
        // history should not be called
        expect(historySpy).toHaveBeenCalledTimes(0);
        expect(mockHistory.location.pathname).toBe('/');
      });

      // simulate expanding a panel
      dashboardApi.expandPanel('123');

      await waitFor(() => {
        expect(dashboardApi.expandedPanelId$.getValue()).toBe('123');
        expect(historySpy).toHaveBeenCalledTimes(1);
        expect(mockHistory.location.pathname).toBe('/create/123');
      });
    });

    it('should expanded panel when expandedPanelId is provided', async () => {
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={mockHistory}
          expandedPanelId="456"
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(expandPanelSpy).toHaveBeenCalledTimes(1);
        expect(historySpy).toHaveBeenCalledTimes(0);
      });

      // simulate minimizing a panel
      dashboardApi.expandPanel('456');

      await waitFor(() => {
        expect(dashboardApi.expandedPanelId$.getValue()).toBe(undefined);
        expect(historySpy).toHaveBeenCalledTimes(1);
        expect(mockHistory.location.pathname).toBe('/create');
      });
    });
  });

  describe('showNoDataPage', () => {
    const mockIsDashboardAppInNoDataState = jest.fn();

    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./no_data/dashboard_app_no_data').isDashboardAppInNoDataState =
        mockIsDashboardAppInNoDataState;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./no_data/dashboard_app_no_data').DashboardAppNoDataPage = () => (
        <div>Mock no data page</div>
      );

      /**
       * Mock the DashboardTopNav + LazyDashboardRenderer component to avoid rendering the actual dashboard
       * and hitting errors that aren't relevant
       */
      (DashboardTopNav as jest.Mock).mockImplementation(() => <>Top nav</>);
      (DashboardRenderer as jest.Mock).mockImplementation(() => <>mock DashboardRenderer</>);
    });

    beforeEach(() => {
      mockIsDashboardAppInNoDataState.mockReset();
    });

    test('should render dashboard when savedDashboardId is provided', async () => {
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={createMemoryHistory()}
          savedDashboardId={'1'}
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('mock DashboardRenderer')).toBeInTheDocument();
        expect(mockIsDashboardAppInNoDataState).toHaveBeenCalledTimes(0);
      });
    });

    test('should render dashboard when incoming embeddables are provided', async () => {
      const stateTransferSpy = jest.spyOn(embeddableService, 'getStateTransfer');
      stateTransferSpy.mockImplementationOnce(
        () =>
          ({
            ...createEmbeddableStateTransferMock(),
            getIncomingEmbeddablePackage: () => [
              {
                type: 'testEmbeddable',
                serializedState: {},
              },
            ],
          } as unknown as EmbeddableStateTransfer)
      );
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={createMemoryHistory()}
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('mock DashboardRenderer')).toBeInTheDocument();
        expect(mockIsDashboardAppInNoDataState).toHaveBeenCalledTimes(0);
      });
    });

    test('should render no data page when isDashboardAppInNoDataState returns true', async () => {
      mockIsDashboardAppInNoDataState.mockResolvedValueOnce(true);
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={createMemoryHistory()}
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Mock no data page')).toBeInTheDocument();
        expect(mockIsDashboardAppInNoDataState).toHaveBeenCalledTimes(1);
      });
    });
  });
});
