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
import { BehaviorSubject } from 'rxjs';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { buildMockDashboardApi, getMockPanels } from '../../mocks';
import { coreServices, uiActionsService } from '../../services/kibana_services';
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

  test('shows more options when expanded', () => {
    renderToolbar(['1']);
    expect(screen.queryByTestId('dashboardSelectedPanelsToolbarRemove')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
    expect(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors')).toBeInTheDocument();
    expect(screen.getByTestId('dashboardSelectedPanelsToolbarRemove')).toHaveTextContent(
      'Delete panels'
    );
    // none of the selected panels have annotations
    expect(
      screen.queryByTestId('dashboardSelectedPanelsToolbarToggleAnnotations')
    ).not.toBeInTheDocument();
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

    fireEvent.click(toggle);
    expect(updateAttributes).toHaveBeenCalledTimes(1);
    expect(attributes.state.visualization.layers[0].annotations[0].isHidden).toBe(true);
    expect(toggle).toHaveTextContent('Show annotations');

    fireEvent.click(toggle);
    expect(attributes.state.visualization.layers[0].annotations[0].isHidden).toBe(false);
    expect(toggle).toHaveTextContent('Hide annotations');
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

  describe('share color mapping', () => {
    const createChart = (title: string, palette: string) => {
      let attributes = {
        state: { visualization: { layers: [{ layerType: 'data', palette: { name: palette } }] } },
      };
      return {
        title$: new BehaviorSubject(title),
        getFullAttributes: () => attributes,
        updateAttributes: jest.fn((next) => {
          attributes = next;
        }),
        getPalette: () => attributes.state.visualization.layers[0].palette.name,
      };
    };

    const setupCharts = (selectedIds: string[]) => {
      const api = renderToolbar(selectedIds);
      const charts = {
        '1': createChart('Requests', 'status'),
        '2': createChart('Bytes', 'default'),
        // not a chart with color mapping: never offered as a source
        '3': { title$: new BehaviorSubject('Notes') },
      };
      act(() => {
        (api.children$ as BehaviorSubject<Record<string, unknown>>).next(charts);
      });
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
      return { api, charts };
    };

    test('is disabled until two charts with color mapping are selected', () => {
      setupCharts(['1', '3']);
      expect(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors')).toBeDisabled();
    });

    test('takes over the toolbar and lists only eligible panels', () => {
      setupCharts(['1', '2', '3']);
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));

      expect(screen.getByTestId('dashboardShareColorsPicker')).toBeInTheDocument();
      expect(screen.getByText('Copy colors from which panel?')).toBeInTheDocument();
      expect(screen.getByLabelText(/Requests/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bytes/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Notes/)).not.toBeInTheDocument();
      // the rest of the toolbar is replaced while picking
      expect(
        screen.queryByTestId('dashboardSelectedPanelsToolbarDuplicate')
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboardShareColorsApply')).toBeDisabled();
    });

    test('names panels whose header title is empty', () => {
      const api = renderToolbar(['1', '2', '3']);
      const withDefaultTitle = {
        ...createChart('', 'status'),
        defaultTitle$: new BehaviorSubject('Response codes'),
      };
      const withAttributesTitle = createChart('', 'default');
      const attributes = withAttributesTitle.getFullAttributes();
      withAttributesTitle.getFullAttributes = () => ({ ...attributes, title: 'Bytes over time' });
      act(() => {
        (api.children$ as BehaviorSubject<Record<string, unknown>>).next({
          '1': withDefaultTitle,
          '2': withAttributesTitle,
          '3': createChart('', 'default'),
        });
      });
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarToggleMore'));
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));

      expect(screen.getByLabelText(/Response codes/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bytes over time/)).toBeInTheDocument();
      // no title at all: "Untitled", with what it shows below
      expect(screen.getByLabelText(/^Untitled/)).toHaveAccessibleName(/Untitled.*Chart/);
    });

    test('points at the panel an option refers to by fading the others back', () => {
      setupCharts(['1', '2']);
      const panel1 = document.createElement('div');
      panel1.id = 'panel-1';
      const panel2 = document.createElement('div');
      panel2.id = 'panel-2';
      document.body.append(panel1, panel2);
      try {
        fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));
        fireEvent.mouseOver(screen.getByLabelText(/Requests/));
        expect(panel1.getAttribute('data-share-colors-dimmed')).toBeNull();
        expect(panel2.getAttribute('data-share-colors-dimmed')).toBe('true');

        // the first option is focused automatically when the picker opens, but that isn't
        // keyboard navigation: once the pointer leaves, every panel looks normal again
        fireEvent.mouseLeave(screen.getByTestId('dashboardShareColorsSources'));
        expect(panel1.getAttribute('data-share-colors-dimmed')).toBeNull();
        expect(panel2.getAttribute('data-share-colors-dimmed')).toBeNull();

        // keyboard navigation does point at the focused option's panel
        const bytesOption = screen.getByLabelText(/Bytes/);
        jest
          .spyOn(bytesOption, 'matches')
          .mockImplementation((selector) => selector === ':focus-visible');
        fireEvent.keyUp(bytesOption, { key: 'ArrowDown' });
        expect(panel1.getAttribute('data-share-colors-dimmed')).toBe('true');
        expect(panel2.getAttribute('data-share-colors-dimmed')).toBeNull();

        fireEvent.click(screen.getByTestId('dashboardShareColorsCancel'));
        expect(panel1.getAttribute('data-share-colors-dimmed')).toBeNull();
        expect(panel2.getAttribute('data-share-colors-dimmed')).toBeNull();
      } finally {
        panel1.remove();
        panel2.remove();
      }
    });

    test('Apply copies the source colors to the other panels and returns to the toolbar', () => {
      const { charts } = setupCharts(['1', '2', '3']);
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));
      fireEvent.click(screen.getByLabelText(/Requests/));
      fireEvent.click(screen.getByTestId('dashboardShareColorsApply'));

      expect(charts['1'].updateAttributes).not.toHaveBeenCalled();
      expect(charts['2'].getPalette()).toBe('status');
      expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Applied colors from "Requests" to 1 panel' })
      );
      expect(screen.queryByTestId('dashboardShareColorsPicker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('dashboardSelectedPanelsToolbarMore')).not.toBeInTheDocument();
      expect(screen.getByTestId('dashboardSelectedPanelsToolbarDuplicate')).toBeInTheDocument();
    });

    test('Cancel goes back to the options without changing anything', () => {
      const { charts } = setupCharts(['1', '2']);
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));
      fireEvent.click(screen.getByLabelText(/Bytes/));
      fireEvent.click(screen.getByTestId('dashboardShareColorsCancel'));

      expect(charts['1'].updateAttributes).not.toHaveBeenCalled();
      expect(charts['2'].updateAttributes).not.toHaveBeenCalled();
      expect(screen.getByTestId('dashboardSelectedPanelsToolbarMore')).toBeInTheDocument();
    });

    test('Escape backs out of the picker without clearing the selection', () => {
      const { api } = setupCharts(['1', '2']);
      fireEvent.click(screen.getByTestId('dashboardSelectedPanelsToolbarShareColors'));
      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByTestId('dashboardShareColorsPicker')).not.toBeInTheDocument();
      expect(api.selectedPanelIds$.getValue().size).toBe(2);
    });
  });
});
