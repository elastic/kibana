/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { Subject } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import { OPEN_DASHBOARD_PRETTIFY_ACTION_ID } from './dashboard_prettify_action';
import { DashboardPrettifyFab } from './dashboard_prettify_fab';

const mockIsCompatible = jest.fn();
const mockExecute = jest.fn();
let mockHasAction = true;

const createDashboardApi = (viewMode: ViewMode = 'edit'): DashboardApi & { anyStateChange$: Subject<void> } => {
  const anyStateChange$ = new Subject<void>();
  return {
    viewMode$: new BehaviorSubject<ViewMode>(viewMode),
    anyStateChange$,
  } as unknown as DashboardApi & { anyStateChange$: Subject<void> };
};

describe('DashboardPrettifyFab', () => {
  beforeEach(() => {
    mockHasAction = true;
    mockIsCompatible.mockReset().mockResolvedValue(true);
    mockExecute.mockReset();
    (uiActionsService.hasAction as jest.Mock).mockImplementation(
      (id: string) => mockHasAction && id === OPEN_DASHBOARD_PRETTIFY_ACTION_ID
    );
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      isCompatible: mockIsCompatible,
      execute: mockExecute,
    });
  });

  it('does not render when the Prettify action is not registered', async () => {
    mockHasAction = false;
    render(
      <EuiThemeProvider>
        <DashboardPrettifyFab dashboardApi={createDashboardApi()} />
      </EuiThemeProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
    });
    expect(uiActionsService.getAction).not.toHaveBeenCalled();
  });

  it('does not render when the action is incompatible', async () => {
    mockIsCompatible.mockResolvedValue(false);
    render(
      <EuiThemeProvider>
        <DashboardPrettifyFab dashboardApi={createDashboardApi()} />
      </EuiThemeProvider>
    );

    await waitFor(() => {
      expect(mockIsCompatible).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
  });

  it('renders the Prettify button when the action is compatible', async () => {
    render(
      <EuiThemeProvider>
        <DashboardPrettifyFab dashboardApi={createDashboardApi()} />
      </EuiThemeProvider>
    );

    expect(await screen.findByTestId('dashboardPrettifyButton')).toBeInTheDocument();
    expect(screen.getByText('Prettify')).toBeInTheDocument();
  });

  it('hides the button when dashboard state becomes incompatible', async () => {
    const dashboardApi = createDashboardApi();
    render(
      <EuiThemeProvider>
        <DashboardPrettifyFab dashboardApi={dashboardApi} />
      </EuiThemeProvider>
    );

    expect(await screen.findByTestId('dashboardPrettifyButton')).toBeInTheDocument();

    mockIsCompatible.mockResolvedValue(false);
    dashboardApi.anyStateChange$.next();

    await waitFor(() => {
      expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
    });
  });

  it('executes the Prettify action with the dashboard API on click', async () => {
    const dashboardApi = createDashboardApi();
    render(
      <EuiThemeProvider>
        <DashboardPrettifyFab dashboardApi={dashboardApi} />
      </EuiThemeProvider>
    );

    fireEvent.click(await screen.findByTestId('dashboardPrettifyButton'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        dashboardApi,
        trigger: { id: OPEN_DASHBOARD_PRETTIFY_ACTION_ID },
      });
    });
  });
});
