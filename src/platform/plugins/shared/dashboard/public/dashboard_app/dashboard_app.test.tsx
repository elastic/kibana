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
import { Subject } from 'rxjs';

import type { DashboardRendererProps } from '../dashboard_renderer/dashboard_renderer';
import { DashboardRenderer } from '../dashboard_renderer/dashboard_renderer';
import { DashboardTopNav } from '../dashboard_top_nav';
import { buildMockDashboardApi } from '../mocks';
import { dataService, embeddableService } from '../services/kibana_services';
import { DashboardApp } from './dashboard_app';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { createEmbeddableStateTransferMock } from '@kbn/embeddable-plugin/public/mocks';

jest.mock('../dashboard_renderer/dashboard_renderer');
jest.mock('../dashboard_top_nav');

describe('Dashboard App', () => {
  dataService.query.filterManager.getFilters = jest.fn().mockImplementation(() => []);

  const { api: dashboardApi, internalApi: dashboardInternalApi, cleanup } = buildMockDashboardApi();
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

  it('test the default behavior without an expandedPanel id passed as a prop to the DashboardApp', async () => {
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

  it('test that the expanded panel behavior subject and history is called when passed as a prop to the DashboardApp', async () => {
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

  describe('same-dashboard incoming embeddables', () => {
    const addIncomingEmbeddablesSpy = jest.spyOn(dashboardApi, 'addIncomingEmbeddables');
    const setViewModeSpy = jest.spyOn(dashboardApi, 'setViewMode');
    const stateTransferMock = embeddableService.getStateTransfer();
    const transferSubject$ = new Subject<unknown>();

    beforeAll(() => {
      (stateTransferMock.onTransferEmbeddablePackage$ as jest.Mock).mockReturnValue(
        transferSubject$
      );
      (embeddableService.getStateTransfer as jest.Mock).mockReturnValue(stateTransferMock);
    });

    beforeEach(() => {
      addIncomingEmbeddablesSpy.mockClear();
      setViewModeSpy.mockClear();
      if (dashboardApi.expandedPanelId$.value) {
        dashboardApi.expandPanel(dashboardApi.expandedPanelId$.value);
      }
    });

    it('adds incoming embeddables when received via the state transfer observable', async () => {
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={mockHistory}
          savedDashboardId="test-dashboard-123"
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
      });

      const incomingEmbeddables = [
        {
          type: 'lens',
          serializedState: { title: 'Chart from the AI sidebar' },
        },
      ];
      transferSubject$.next(incomingEmbeddables);

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).toHaveBeenCalledTimes(1);
        expect(addIncomingEmbeddablesSpy).toHaveBeenCalledWith(incomingEmbeddables);
        expect(setViewModeSpy).toHaveBeenCalledWith('edit');
      });
    });

    it('minimizes expanded panel when receiving incoming embeddables', async () => {
      dashboardApi.expandPanel('maximized-panel-id');
      expandPanelSpy.mockClear();

      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={mockHistory}
          savedDashboardId="test-dashboard-123"
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
      });

      const incomingEmbeddables = [
        {
          type: 'lens',
          serializedState: { title: 'Chart from the AI sidebar' },
        },
      ];
      transferSubject$.next(incomingEmbeddables);

      await waitFor(() => {
        expect(expandPanelSpy).toHaveBeenCalledWith('maximized-panel-id');
        expect(addIncomingEmbeddablesSpy).toHaveBeenCalledTimes(1);
        expect(addIncomingEmbeddablesSpy).toHaveBeenCalledWith(incomingEmbeddables);
        expect(setViewModeSpy).toHaveBeenCalledWith('edit');
      });
    });

    it('does nothing when the state transfer observable emits undefined', async () => {
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={mockHistory}
          savedDashboardId="test-dashboard-456"
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
      });

      transferSubject$.next(undefined);

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
        expect(setViewModeSpy).not.toHaveBeenCalled();
      });
    });

    it('does nothing when the state transfer observable emits an empty array', async () => {
      render(
        <DashboardApp
          redirectTo={jest.fn()}
          history={mockHistory}
          savedDashboardId="test-dashboard-789"
          setDashboardAppApi={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
      });

      transferSubject$.next([]);

      await waitFor(() => {
        expect(addIncomingEmbeddablesSpy).not.toHaveBeenCalled();
        expect(setViewModeSpy).not.toHaveBeenCalled();
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
