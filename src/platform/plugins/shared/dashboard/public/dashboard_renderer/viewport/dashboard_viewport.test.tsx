/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiThemeProvider } from '@elastic/eui';
import { render, waitFor } from '@testing-library/react';

import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi, getMockPanels } from '../../mocks';
import { DashboardViewport } from './dashboard_viewport';
import { BehaviorSubject, first, skipWhile } from 'rxjs';
import type { DashboardInternalApi } from '../../dashboard_api/types';

jest.mock('../grid', () => {
  return {
    DashboardGrid: () => <div data-test-subj="mockDashboardGrid" />,
  };
});

const renderDashboardViewport = async (internalApiOverrides?: Partial<DashboardInternalApi>) => {
  const panels = getMockPanels();
  const { api, internalApi } = buildMockDashboardApi({
    overrides: {
      panels,
    },
  });
  const component = render(
    <EuiThemeProvider>
      <DashboardContext.Provider value={api}>
        <DashboardInternalContext.Provider
          value={{
            ...internalApi,
            ...internalApiOverrides,
          }}
        >
          <DashboardViewport />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    </EuiThemeProvider>
  );

  // wait for first render
  await waitFor(() => {
    component.getByTestId('dshDashboardViewport');
  });

  return { dashboardApi: api, internalApi, component };
};

describe('DashboardViewport', () => {
  test('should render DashboardGrid when dashboard has panels', async () => {
    const { component } = await renderDashboardViewport();
    await waitFor(() => {
      component.getByTestId('mockDashboardGrid');
    });
  });

  test('should not render DashboardGrid until controls are ready', async () => {
    const controlsReadyMock$ = new BehaviorSubject(false);
    const { component } = await renderDashboardViewport({
      untilControlsInitialized: () => {
        return new Promise((resolve) => {
          controlsReadyMock$
            .pipe(
              skipWhile((controlsReady) => !controlsReady),
              first()
            )
            .subscribe(() => {
              resolve();
            });
        });
      },
    });

    await waitFor(() => {
      expect(component.queryByTestId('mockDashboardGrid')).toBeNull();
    });

    // simulate controls ready
    controlsReadyMock$.next(true);

    await waitFor(() => {
      component.getByTestId('mockDashboardGrid');
    });
  });

  test('renders print mode styles', async () => {
    const { component, dashboardApi } = await renderDashboardViewport();
    dashboardApi.setViewMode('print');

    await waitFor(() => {
      const viewport = component.getByTestId('dshDashboardViewport');
      expect(viewport).toHaveClass('dshDashboardViewport--print');
    });
    /**
     * TODO: Once Dashboard is converted to Emotion, we should be able to uncomment these lines in order
     * to actually test the print mode functionality - currently, this is broken because our Sass styles
     * are imported on the Dashboard renderer rather than the viewport
     */
    // const gridLayout = component.getByTestId('kbnGridLayout');
    // expect(gridLayout).toHaveStyleRule('display', 'block !important');
  });
});
