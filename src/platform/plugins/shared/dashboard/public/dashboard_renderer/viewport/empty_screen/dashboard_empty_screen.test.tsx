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
let mockHasChatAction = true;
const mockExecute = jest.fn();

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
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = true;
    mockFeaturedItemsLoading = false;
    mockHasChatAction = true;
    mockExecute.mockClear();
    (uiActionsService.hasAction as jest.Mock).mockImplementation(() => mockHasChatAction);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      execute: mockExecute,
    });
  });

  test('renders correctly with view mode', () => {
    mockHasChatAction = false;
    renderComponent('view');

    expect(screen.getByTestId('dashboardEmptyReadWrite')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with edit mode', () => {
    mockHasChatAction = false;
    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardEmptyReadOnly')).not.toBeInTheDocument();
    expect(screen.getByTestId('emptyDashboardWidget')).toBeInTheDocument();
    expect(screen.getByText('This dashboard is empty. Let\u2019s fill it up!')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
  });

  test('renders the empty-screen chat card when the Chat action is available', () => {
    renderComponent('edit');

    expect(screen.getByText('Create with chat')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardCreateWithChatOpenChat')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
    // Chat uses the elaborate empty-screen card, not FeaturedItemCard.
    expect(screen.queryByTestId('create-action-Create with chat')).not.toBeInTheDocument();
  });

  test('opens Chat with the selected prompt', async () => {
    renderComponent('edit');

    fireEvent.click(screen.getByTestId('dashboardCreateWithChatMetricsPrompt'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        initialMessage: 'Create a dashboard for my metrics',
        trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
      });
    });
  });

  test('opens Chat without a prefilled prompt from Open chat', async () => {
    renderComponent('edit');

    fireEvent.click(screen.getByTestId('dashboardCreateWithChatOpenChat'));

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
      });
    });
  });

  test('does not render Chat when the Chat action is unavailable', () => {
    mockHasChatAction = false;
    renderComponent('edit');

    expect(screen.getByTestId('emptyDashboardWidget')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction')).toBeInTheDocument();
    expect(screen.getByTestId('mockAddPanelAction').tagName).toBe('BUTTON');
  });

  test('waits for featured items before rendering the edit empty screen', () => {
    mockFeaturedItemsLoading = true;

    renderComponent('edit');

    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dashboardCreateWithChatMetricsPrompt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mockAddPanelAction')).not.toBeInTheDocument();
  });

  test('renders empty-screen featured panels as buttons', () => {
    mockHasChatAction = false;
    renderComponent('edit');

    expect(screen.getByTestId('mockAddPanelAction').tagName).toBe('BUTTON');
  });

  test('renders correctly with readonly mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
    mockHasChatAction = false;

    renderComponent('view');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });

  test('renders correctly with readonly and edit mode', () => {
    (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
    mockHasChatAction = false;

    renderComponent('edit');

    expect(screen.queryByTestId('dashboardEmptyReadWrite')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardEmptyReadOnly')).toBeInTheDocument();
    expect(screen.queryByTestId('emptyDashboardWidget')).not.toBeInTheDocument();
  });
});
