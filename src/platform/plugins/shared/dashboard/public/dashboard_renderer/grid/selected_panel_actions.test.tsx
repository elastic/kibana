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
import { fireEvent, render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { buildMockDashboardApi, getMockPanels } from '../../mocks';
import { coreServices } from '../../services/kibana_services';
import { SelectedPanelActions } from './selected_panel_actions';

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

const renderActions = (panelId: string, selectedIds: string[]) => {
  const { api } = buildMockDashboardApi({ overrides: { panels: getMockPanels() } });
  const charts = {
    '1': createChart('Requests', 'status'),
    '2': createChart('Bytes', 'default'),
    // not a chart with color mapping
    '3': { title$: new BehaviorSubject('Notes') },
  };
  (api.children$ as BehaviorSubject<Record<string, unknown>>).next(charts);
  render(
    <EuiThemeProvider>
      <DashboardContext.Provider value={api}>
        <SelectedPanelActions panelId={panelId} selectedPanelIds={new Set(selectedIds)} />
      </DashboardContext.Provider>
    </EuiThemeProvider>
  );
  return charts;
};

describe('SelectedPanelActions', () => {
  test('shares the panel colors with the other selected color-mapped panels', () => {
    const charts = renderActions('1', ['1', '2', '3']);

    fireEvent.click(screen.getByTestId('dashboardSelectedPanelShareColors'));

    expect(charts['1'].updateAttributes).not.toHaveBeenCalled();
    expect(charts['2'].getPalette()).toBe('status');
    expect(coreServices.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Applied colors from "Requests" to 1 panel' })
    );
  });

  test('renders nothing when no other selected panel has a color mapping', () => {
    renderActions('1', ['1', '3']);
    expect(screen.queryByTestId('dashboardSelectedPanelShareColors')).not.toBeInTheDocument();
  });

  test('renders nothing on a panel without a color mapping', () => {
    renderActions('3', ['1', '2', '3']);
    expect(screen.queryByTestId('dashboardSelectedPanelShareColors')).not.toBeInTheDocument();
  });
});
