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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { buildMockDashboardApi, getMockPanels } from '../../mocks';
import { uiActionsService } from '../../services/kibana_services';
import { SelectedPanelsToolbar } from './selected_panels_toolbar';
import { ADD_PANELS_TO_CHAT_ACTION_ID } from './add_panels_to_chat_action';

const mockExecute = jest.fn();
const mockIsCompatible = jest.fn();

const renderToolbar = (selectedIds: string[]) => {
  const { api } = buildMockDashboardApi({ overrides: { panels: getMockPanels() } });
  const selectedPanelIds = new Set(selectedIds);
  api.setSelectedPanelIds(selectedPanelIds);
  render(
    <EuiThemeProvider>
      <DashboardContext.Provider value={api}>
        <SelectedPanelsToolbar selectedPanelIds={selectedPanelIds} />
      </DashboardContext.Provider>
    </EuiThemeProvider>
  );
  return api;
};

describe('SelectedPanelsToolbar', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockIsCompatible.mockReset().mockResolvedValue(true);
    (uiActionsService.hasAction as jest.Mock).mockReturnValue(false);
    (uiActionsService.getAction as jest.Mock).mockResolvedValue({
      execute: mockExecute,
      isCompatible: mockIsCompatible,
    });
  });

  test('shows the number of selected panels', () => {
    renderToolbar(['1', '2']);
    expect(screen.getByTestId('dashboardSelectedPanelsCount')).toHaveTextContent('2 selected');
  });

  test('clears the selection', () => {
    const api = renderToolbar(['1']);
    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarClear'));
    expect(api.selectedPanelIds$.getValue().size).toBe(0);
  });

  test('clears the selection on Escape', () => {
    const api = renderToolbar(['1']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(api.selectedPanelIds$.getValue().size).toBe(0);
  });

  test('disables grouping with fewer than two panels', () => {
    renderToolbar(['1']);
    expect(screen.getByTestId('dashboardSelectedPanelsToolbarGroup')).toBeDisabled();
  });

  test('shows the keyboard shortcuts in a popover instead of the layout options', () => {
    renderToolbar(['1']);
    expect(screen.queryByTestId('dashboardSelectedPanelsToolbarLayout')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShortcuts'));
    const popover = screen.getByTestId('dashboardSelectedPanelsToolbarShortcutsPopover');
    expect(popover).toHaveTextContent('Keyboard shortcuts');
    expect(popover).toHaveTextContent('Copy selected panels');
    expect(popover).toHaveTextContent('Area select');
  });

  test('shows more options in a popover', () => {
    renderToolbar(['1']);
    expect(screen.queryByTestId('dashboardSelectedPanelsToolbarRemove')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
    expect(
      screen.queryByTestId('dashboardSelectedPanelsToolbarShareColors')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboardSelectedPanelsToolbarRemove')).toHaveTextContent(
      'Delete panels'
    );
    // none of the selected panels have annotations
    expect(
      screen.queryByTestId('dashboardSelectedPanelsToolbarToggleAnnotations')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  test('toggles annotations of the selected panels', () => {
    const api = renderToolbar(['1']);
    let attributes = {
      state: {
        visualization: {
          layers: [{ layerType: 'annotations', annotations: [{ id: 'a', isHidden: false }] }],
        },
      },
    };
    const updateAttributes = jest.fn((next) => {
      attributes = next;
    });
    act(() => {
      (api.children$ as BehaviorSubject<Record<string, unknown>>).next({
        '1': { getFullAttributes: () => attributes, updateAttributes },
      });
    });

    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
    const toggle = screen.getByTestId('dashboardSelectedPanelsToolbarToggleAnnotations');
    expect(toggle).toHaveTextContent('Hide annotations');
    expect(screen.getByRole('separator')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(updateAttributes).toHaveBeenCalledTimes(1);
    expect(attributes.state.visualization.layers[0].annotations[0].isHidden).toBe(true);

    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
    const showAnnotations = screen.getByTestId('dashboardSelectedPanelsToolbarToggleAnnotations');
    expect(showAnnotations).toHaveTextContent('Show annotations');
    fireEvent.click(showAnnotations);
    expect(attributes.state.visualization.layers[0].annotations[0].isHidden).toBe(false);
  });

  test('hides "Add to chat" when AI chat is not available', () => {
    renderToolbar(['1']);
    expect(screen.queryByTestId('dashboardSelectedPanelsToolbarAddToChat')).not.toBeInTheDocument();
  });

  test('sends the selected panels to the chat when AI chat is available', async () => {
    (uiActionsService.hasAction as jest.Mock).mockImplementation(
      (id: string) => id === ADD_PANELS_TO_CHAT_ACTION_ID
    );
    renderToolbar(['1', '2']);

    const button = await screen.findByTestId('dashboardSelectedPanelsToolbarAddToChat');
    fireEvent.click(button);

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute.mock.calls[0][0].panelIds).toEqual(['1', '2']);
  });
});
