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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject, map, merge, skip } from 'rxjs';
import type { DashboardApi } from '../../dashboard_api/types';
import { uiActionsService } from '../../services/kibana_services';
import { PRETTIFY_DASHBOARD_ACTION_ID } from './prettify_dashboard_action';
import { PrettifyDashboardButton } from './prettify_dashboard_button';

type TestDashboardApi = DashboardApi & {
  viewMode$: BehaviorSubject<string>;
};

const createDashboardApi = (): TestDashboardApi =>
  ({
    viewMode$: new BehaviorSubject('edit'),
    children$: new BehaviorSubject({}),
  } as unknown as TestDashboardApi);

const renderButton = (dashboardApi = createDashboardApi()) => {
  render(
    <EuiThemeProvider>
      <PrettifyDashboardButton dashboardApi={dashboardApi} />
    </EuiThemeProvider>
  );
  return dashboardApi;
};

describe('PrettifyDashboardButton', () => {
  const mockExecute = jest.fn();
  const mockIsCompatible = jest.fn(async () => true);

  beforeEach(() => {
    mockExecute.mockClear();
    mockIsCompatible.mockReset();
    mockIsCompatible.mockResolvedValue(true);
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(true);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      isCompatible: mockIsCompatible,
      execute: mockExecute,
      getDisplayName: () => 'Enhance this dashboard',
      getIconType: () => 'sparkles',
      getCompatibilityChangesSubject: ({ dashboardApi }: { dashboardApi: DashboardApi }) =>
        merge(dashboardApi.viewMode$, dashboardApi.children$).pipe(
          skip(1),
          map(() => undefined)
        ),
    });
  });

  it('is hidden when the action is not registered', () => {
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);

    renderButton();

    expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
  });

  it('is hidden when the action is incompatible', async () => {
    mockIsCompatible.mockResolvedValue(false);

    renderButton();

    await waitFor(() => {
      expect(mockIsCompatible).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
  });

  it('executes the action on click', async () => {
    const dashboardApi = renderButton();

    await waitFor(() => {
      expect(screen.getByTestId('dashboardPrettifyButton')).toBeInTheDocument();
    });
    expect(screen.getByTestId('dashboardPrettifyButton')).toHaveTextContent(
      'Enhance this dashboard'
    );

    fireEvent.click(screen.getByTestId('dashboardPrettifyButton'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        dashboardApi,
        trigger: { id: PRETTIFY_DASHBOARD_ACTION_ID },
      });
    });
  });

  it('hides when the action becomes incompatible', async () => {
    mockIsCompatible.mockResolvedValue(true);
    const dashboardApi = renderButton();

    await waitFor(() => {
      expect(screen.getByTestId('dashboardPrettifyButton')).toBeInTheDocument();
    });

    mockIsCompatible.mockResolvedValue(false);
    dashboardApi.viewMode$.next('view');

    await waitFor(() => {
      expect(screen.queryByTestId('dashboardPrettifyButton')).not.toBeInTheDocument();
    });
  });
});
