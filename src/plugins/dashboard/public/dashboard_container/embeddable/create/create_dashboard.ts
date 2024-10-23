/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, omit } from 'lodash';

import { ViewMode } from '@kbn/embeddable-plugin/public';

import { DashboardContainerInput, DashboardPanelMap } from '../../../../common';
import { DEFAULT_DASHBOARD_INPUT } from '../../../dashboard_constants';
import {
  PANELS_CONTROL_GROUP_KEY,
  getDashboardBackupService,
} from '../../../services/dashboard_backup_service';
import {
  LoadDashboardReturn,
  SavedDashboardInput,
} from '../../../services/dashboard_content_management_service/types';
import { embeddableService } from '../../../services/kibana_services';
import { getDashboardCapabilities } from '../../../utils/get_dashboard_capabilities';
import { UnsavedPanelState } from '../../types';
import { DashboardContainer } from '../dashboard_container';
import type { DashboardCreationOptions } from '../../..';

/**
 * Initializes a Dashboard and starts all of its integrations
 */
export const initializeDashboard = async ({
  loadDashboardReturn,
  untilDashboardReady,
  creationOptions,
}: {
  loadDashboardReturn: LoadDashboardReturn;
  untilDashboardReady: () => Promise<DashboardContainer>;
  creationOptions?: DashboardCreationOptions;
}) => {
  const dashboardBackupService = getDashboardBackupService();

  const { getInitialInput, validateLoadedSavedObject, useSessionStorageIntegration } =
    creationOptions ?? {};

  // --------------------------------------------------------------------------------------
  // Run validation.
  // --------------------------------------------------------------------------------------
  const validationResult = loadDashboardReturn && validateLoadedSavedObject?.(loadDashboardReturn);
  if (validationResult === 'invalid') {
    // throw error to stop the rest of Dashboard loading and make the factory return an ErrorEmbeddable.
    throw new Error('Dashboard failed saved object result validation');
  } else if (validationResult === 'redirected') {
    return;
  }

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, and session storage
  // --------------------------------------------------------------------------------------
  const dashboardBackupState = dashboardBackupService.getState(loadDashboardReturn.dashboardId);
  const runtimePanelsToRestore: UnsavedPanelState = useSessionStorageIntegration
    ? dashboardBackupState?.panels ?? {}
    : {};

  const sessionStorageInput = ((): Partial<SavedDashboardInput> | undefined => {
    if (!useSessionStorageIntegration) return;
    return dashboardBackupState?.dashboardState;
  })();
  const initialViewMode = (() => {
    if (loadDashboardReturn.managed || !getDashboardCapabilities().showWriteControls)
      return ViewMode.VIEW;
    if (
      loadDashboardReturn.newDashboardCreated ||
      dashboardBackupService.dashboardHasUnsavedEdits(loadDashboardReturn.dashboardId)
    ) {
      return ViewMode.EDIT;
    }

    return dashboardBackupService.getViewMode();
  })();

  const combinedSessionInput: DashboardContainerInput = {
    ...DEFAULT_DASHBOARD_INPUT,
    ...(loadDashboardReturn?.dashboardInput ?? {}),
    ...sessionStorageInput,
  };

  // --------------------------------------------------------------------------------------
  // Combine input with overrides.
  // --------------------------------------------------------------------------------------
  const overrideInput = getInitialInput?.();
  if (overrideInput?.panels) {
    /**
     * react embeddables and legacy embeddables share state very differently, so we need different
     * treatment here. TODO remove this distinction when we remove the legacy embeddable system.
     */
    const overridePanels: DashboardPanelMap = {};

    for (const panel of Object.values(overrideInput?.panels)) {
      if (embeddableService.reactEmbeddableRegistryHasKey(panel.type)) {
        overridePanels[panel.explicitInput.id] = {
          ...panel,

          /**
           * here we need to keep the state of the panel that was already in the Dashboard if one exists.
           * This is because this state will become the "last saved state" for this panel.
           */
          ...(combinedSessionInput.panels[panel.explicitInput.id] ?? []),
        };
        /**
         * We also need to add the state of this react embeddable into the runtime state to be restored.
         */
        runtimePanelsToRestore[panel.explicitInput.id] = panel.explicitInput;
      } else {
        /**
         * if this is a legacy embeddable, the override state needs to completely overwrite the existing
         * state for this panel.
         */
        overridePanels[panel.explicitInput.id] = panel;
      }
    }

    /**
     * If this is a React embeddable, we leave the "panel" state as-is and add this state to the
     * runtime state to be restored on dashboard load.
     */
    overrideInput.panels = overridePanels;
  }
  const combinedOverrideInput: DashboardContainerInput = {
    ...combinedSessionInput,
    ...(initialViewMode ? { viewMode: initialViewMode } : {}),
    ...overrideInput,
  };

  // --------------------------------------------------------------------------------------
  // Combine input from saved object, session storage, & passed input to create initial input.
  // --------------------------------------------------------------------------------------
  const initialDashboardInput: DashboardContainerInput = omit(
    cloneDeep(combinedOverrideInput),
    'controlGroupInput'
  );

  // Back up any view mode passed in explicitly.
  if (overrideInput?.viewMode) {
    dashboardBackupService.storeViewMode(overrideInput?.viewMode);
  }

  initialDashboardInput.executionContext = {
    type: 'dashboard',
    description: initialDashboardInput.title,
  };

  // --------------------------------------------------------------------------------------
  // Set restored runtime state for react embeddables.
  // --------------------------------------------------------------------------------------
  untilDashboardReady().then((dashboardContainer) => {
    if (overrideInput?.controlGroupState) {
      dashboardContainer.setRuntimeStateForChild(
        PANELS_CONTROL_GROUP_KEY,
        overrideInput.controlGroupState
      );
    }

    for (const idWithRuntimeState of Object.keys(runtimePanelsToRestore)) {
      const restoredRuntimeStateForChild = runtimePanelsToRestore[idWithRuntimeState];
      if (!restoredRuntimeStateForChild) continue;
      dashboardContainer.setRuntimeStateForChild(idWithRuntimeState, restoredRuntimeStateForChild);
    }
  });

  return { input: initialDashboardInput };
};
