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
import { DashboardContext } from '../../../dashboard_api/use_dashboard_api';
import type { DashboardApi } from '../../../dashboard_api/types';
import { coreServices, uiActionsService } from '../../../services/kibana_services';
import { DashboardEmptyScreen } from './dashboard_empty_screen';
import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from './dashboard_empty_screen_chat_action';

let mockFeaturedItemsLoading = false;
const execute = jest.fn();
const isCompatible = jest.fn();

jest.mock('../../../dashboard_app/top_nav/add_panel_button/use_featured_items', () => {
  return {
    useFeaturedItems: () => ({
      featuredItems: [
        {
          id: '1',
          name: 'Mock Add Panel',
          icon: 'chart',
          onClick: jest.fn(),
          order: 0,
          ['data-test-subj']: 'mockAddPanelAction',
        },
      ],
      loading: mockFeaturedItemsLoading,
    }),
  };
});

describe('DashboardEmptyScreen', () => {
  function renderComponent(viewMode: ViewMode) {
    const mockDashboardApi = {
      viewMode$: new BehaviorSubject<ViewMode>(viewMode),
    } as unknown as DashboardApi;
    return render(
      <EuiThemeProvider>
        <DashboardContext.Provider value={mockDashboardApi}>
          <DashboardEmptyScreen />
        </DashboardContext.Provider>
      </EuiThemeProvider>
    );
  }

  beforeEach(() => {
    // Reset capabilities before each test
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;
    mockFeaturedItemsLoading = false;
    execute.mockClear();
    isCompatible.mockReset().mockResolvedValue(true);
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(true);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      execute,
      isCompatible,
    });
  });

  test('renders correctly with view mode', () => {
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);
    renderComponent('view');

    expect(screen.getByTestId('dashboardEmptyReadWrite')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with edit mode', async () => {
    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(await screen.findByTestId('emptyDashboardWidget')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
  });

  test('renders Chat when its action is registered and compatible', async () => {
    renderComponent('edit');

    expect(await screen.findByText('Create with chat')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardCreateWithChatOpenChat')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
  });

  test('executes the Chat action with the selected prompt', async () => {
    renderComponent('edit');

    fireEvent.click(await screen.findByTestId('dashboardCreateWithChatMetricsPrompt'));

    expect(execute).toHaveBeenCalledWith({
      initialMessage: 'Create a dashboard for my metrics',
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });
  });

  test('opens Chat without a prefilled prompt from Open chat', async () => {
    renderComponent('edit');

    fireEvent.click(await screen.findByTestId('dashboardCreateWithChatOpenChat'));

    expect(execute).toHaveBeenCalledWith({
      initialMessage: '',
      trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
    });
  });

  test.each([
    ['is not registered', false, true],
    ['is incompatible', true, false],
  ])('does not render Chat when its action %s', async (_label, isRegistered, compatible) => {
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(isRegistered);
    isCompatible.mockResolvedValue(compatible);

    renderComponent('edit');

    await waitFor(() => expect(screen.getByTestId('emptyDashboardWidget')).toBeInTheDocument());
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction').tagName).toBe('BUTTON');
  });

  test('renders featured actions when loading the Chat action fails', async () => {
    (uiActionsService.getAction as jest.Mock).mockRejectedValue(new Error('Unable to load action'));

    renderComponent('edit');

    expect(await screen.findByTestId('emptyDashboardWidget')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
  });

  test('waits for featured items before rendering the edit empty screen', () => {
    mockFeaturedItemsLoading = true;
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);

    renderComponent('edit');

    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockAddPanelAction')).not.toBeInTheDocument();
  });

  test('waits for Chat compatibility before rendering the edit empty screen', () => {
    isCompatible.mockReturnValue(new Promise(() => {}));

    renderComponent('edit');

    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockAddPanelAction')).not.toBeInTheDocument();
  });

  test('renders empty-screen featured panels as buttons', async () => {
    renderComponent('edit');

    expect((await screen.findByTestId('mockAddPanelAction')).tagName).toBe('BUTTON');
  });

  test('renders correctly with readonly mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);

    renderComponent('view');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with readonly and edit mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);

    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });
});
