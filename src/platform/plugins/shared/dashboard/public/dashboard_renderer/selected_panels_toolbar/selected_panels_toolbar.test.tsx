/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  openCopyToDashboardModal,
  userCanCopyToDashboard,
} from '../../dashboard_actions/copy_to_dashboard_action';
import { SelectedPanelsToolbar } from './selected_panels_toolbar';

const mockDashboardApi = {
  selectedPanelIds$: new BehaviorSubject<string[]>([]),
  viewMode$: new BehaviorSubject<ViewMode>('edit'),
  children$: new BehaviorSubject<Record<string, { isDuplicable: boolean }>>({}),
  canRemovePanels: jest.fn(() => true),
  removePanels: jest.fn(),
  clearSelectedPanels: jest.fn(),
};

jest.mock('../../dashboard_api/use_dashboard_api', () => ({
  useDashboardApi: () => mockDashboardApi,
}));

jest.mock('../../dashboard_actions/copy_to_dashboard_action', () => ({
  openCopyToDashboardModal: jest.fn(),
  userCanCopyToDashboard: jest.fn(() => true),
}));

const renderToolbar = () =>
  render(
    <I18nProvider>
      <SelectedPanelsToolbar />
    </I18nProvider>
  );

describe('SelectedPanelsToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardApi.canRemovePanels.mockReturnValue(true);
    mockDashboardApi.viewMode$.next('edit');
    mockDashboardApi.children$.next({
      panel1: { isDuplicable: true },
      panel2: { isDuplicable: true },
      esqlControl: { isDuplicable: false },
    });
    mockDashboardApi.selectedPanelIds$.next(['panel1', 'panel2']);
  });

  it('renders nothing when no panel is selected', () => {
    mockDashboardApi.selectedPanelIds$.next([]);
    renderToolbar();

    expect(screen.queryByTestId('dashboardSelectedPanelsToolbar')).not.toBeInTheDocument();
  });

  it('renders nothing outside edit mode', () => {
    mockDashboardApi.viewMode$.next('view');
    renderToolbar();

    expect(screen.queryByTestId('dashboardSelectedPanelsToolbar')).not.toBeInTheDocument();
  });

  it('shows the number of selected panels and follows the selection', async () => {
    renderToolbar();
    expect(screen.getByTestId('dashboardSelectedPanelsCount')).toHaveTextContent('2 selected');

    act(() => mockDashboardApi.selectedPanelIds$.next(['panel1']));

    await waitFor(() =>
      expect(screen.getByTestId('dashboardSelectedPanelsCount')).toHaveTextContent('1 selected')
    );
  });

  it('clears the selection', async () => {
    renderToolbar();

    await userEvent.click(screen.getByTestId('dashboardSelectedPanelsClear'));

    expect(mockDashboardApi.clearSelectedPanels).toHaveBeenCalled();
    expect(mockDashboardApi.removePanels).not.toHaveBeenCalled();
  });

  describe('Delete panels', () => {
    it('is an icon button labelled "Delete panels"', () => {
      renderToolbar();
      expect(screen.getByTestId('dashboardSelectedPanelsRemove')).toHaveAccessibleName(
        'Delete panels'
      );
    });

    it('removes exactly the selected panels and clears the selection', async () => {
      renderToolbar();

      await userEvent.click(screen.getByTestId('dashboardSelectedPanelsRemove'));

      expect(mockDashboardApi.removePanels).toHaveBeenCalledWith(['panel1', 'panel2']);
      expect(mockDashboardApi.clearSelectedPanels).toHaveBeenCalled();
    });

    it('removes nothing when the dashboard does not allow removing panels', async () => {
      mockDashboardApi.canRemovePanels.mockReturnValue(false);
      renderToolbar();

      await userEvent.click(screen.getByTestId('dashboardSelectedPanelsRemove'));

      expect(mockDashboardApi.removePanels).not.toHaveBeenCalled();
    });
  });

  describe('entrance', () => {
    it('plays when the toolbar first appears', () => {
      renderToolbar();
      expect(screen.getByTestId('dashboardSelectedPanelsToolbar')).toHaveAttribute(
        'data-skip-entrance',
        'false'
      );
    });

    it('is skipped when panels are selected again right after the toolbar left', async () => {
      renderToolbar();
      act(() => mockDashboardApi.selectedPanelIds$.next([]));
      await waitFor(() =>
        expect(screen.queryByTestId('dashboardSelectedPanelsToolbar')).not.toBeInTheDocument()
      );
      act(() => mockDashboardApi.selectedPanelIds$.next(['panel1']));

      await waitFor(() =>
        expect(screen.getByTestId('dashboardSelectedPanelsToolbar')).toHaveAttribute(
          'data-skip-entrance',
          'true'
        )
      );
    });
  });

  describe('Copy to dashboard', () => {
    it('opens the copy modal with the selected panels', async () => {
      renderToolbar();

      await userEvent.click(screen.getByTestId('dashboardSelectedPanelsCopyToDashboard'));

      expect(openCopyToDashboardModal).toHaveBeenCalledWith(mockDashboardApi, ['panel1', 'panel2']);
    });

    it('is disabled when one of the selected panels cannot be copied', () => {
      mockDashboardApi.selectedPanelIds$.next(['panel1', 'esqlControl']);
      renderToolbar();

      const copyButton = screen.getByTestId('dashboardSelectedPanelsCopyToDashboard');
      expect(copyButton).toHaveAttribute('aria-disabled', 'true');

      // The button stays focusable for its tooltip, so the click handler itself must be blocked too
      fireEvent.click(copyButton);
      expect(openCopyToDashboardModal).not.toHaveBeenCalled();
    });

    it('is hidden when the user cannot copy to any dashboard', () => {
      jest.mocked(userCanCopyToDashboard).mockReturnValueOnce(false);
      renderToolbar();

      expect(
        screen.queryByTestId('dashboardSelectedPanelsCopyToDashboard')
      ).not.toBeInTheDocument();
    });
  });
});
