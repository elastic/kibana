/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import {
  applySelectedPanelsLayout,
  type SelectedPanelsLayoutMode,
} from '../../dashboard_api/layout_manager/apply_selected_panels_layout';
import { CopyToDashboardModal } from '../../dashboard_actions/copy_to_dashboard_modal';
import { coreServices } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';

/**
 * Bulk actions that operate on a set of panels. Shared by the panel context menu and the
 * selected panels toolbar so both surfaces behave identically.
 */
export const useBulkPanelActions = (panelIds: Set<string>) => {
  const dashboardApi = useDashboardApi();

  const duplicate = useCallback(async () => {
    const ids = Array.from(panelIds);
    if (ids.length === 0) return;
    if (ids.length === 1 && dashboardApi.duplicatePanel) {
      await dashboardApi.duplicatePanel(ids[0]);
    } else if (dashboardApi.duplicatePanels) {
      await dashboardApi.duplicatePanels(ids);
    } else {
      for (const id of ids) {
        try {
          await dashboardApi.duplicatePanel(id);
        } catch {
          // skip
        }
      }
    }
  }, [dashboardApi, panelIds]);

  const remove = useCallback(() => {
    const ids = Array.from(panelIds);
    if (ids.length === 0) return;
    try {
      if (ids.length === 1 && dashboardApi.removePanel) {
        dashboardApi.removePanel(ids[0]);
      } else if (dashboardApi.removePanels) {
        dashboardApi.removePanels(ids);
      } else {
        ids.forEach((id) => {
          try {
            dashboardApi.removePanel(id);
          } catch {
            // skip
          }
        });
      }
    } finally {
      const nextSelected = new Set(dashboardApi.selectedPanelIds$.getValue());
      ids.forEach((id) => nextSelected.delete(id));
      dashboardApi.setSelectedPanelIds(nextSelected);
    }
  }, [dashboardApi, panelIds]);

  const canGroup = panelIds.size >= 2;

  const group = useCallback(() => {
    if (panelIds.size < 2) return;
    dashboardApi.movePanelsToNewSection(Array.from(panelIds));
  }, [dashboardApi, panelIds]);

  const applyLayout = useCallback(
    (mode: SelectedPanelsLayoutMode) => {
      if (panelIds.size === 0) return;
      const layout = dashboardApi.layout$.getValue();
      dashboardApi.layout$.next(applySelectedPanelsLayout(layout, panelIds, mode));
    },
    [dashboardApi, panelIds]
  );

  const canCopyToDashboard = useMemo(() => {
    const { createNew: canCreateNew, showWriteControls: canEditExisting } =
      getDashboardCapabilities();
    return Boolean(canCreateNew || canEditExisting);
  }, []);

  const copyToDashboard = useCallback(() => {
    const [panelId] = Array.from(panelIds);
    if (!panelId) return;
    // the copy to dashboard modal reads the panels to copy from the dashboard selection
    dashboardApi.setSelectedPanelIds(panelIds);
    const panelType = dashboardApi.layout$.getValue().panels[panelId]?.type ?? 'unknown';
    const api = {
      type: panelType,
      uuid: panelId,
      parentApi: dashboardApi,
    };
    const session = coreServices.overlays.openModal(
      toMountPoint(
        <CopyToDashboardModal closeModal={() => session.close()} api={api} />,
        coreServices
      ),
      {
        maxWidth: 400,
        'data-test-subj': 'copyToDashboardPanel',
      }
    );
  }, [dashboardApi, panelIds]);

  return {
    duplicate,
    remove,
    group,
    canGroup,
    applyLayout,
    copyToDashboard,
    canCopyToDashboard,
  };
};
