/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import {
  ENTITY_FLYOUT_SIMULATION_LOCAL_STORAGE_KEY,
  ENTITY_FLYOUT_SIMULATION_UI_SETTING,
} from '../../../common/constants';

const ENTITY_SIMULATION_URL_PARAM = 'entitySimulation';

/**
 * If the page URL contains `?entitySimulation=1`, persist the demo flag to localStorage and strip the param.
 * Call once on Discover mount so bookmarks enable the simulation without DevTools.
 */
export function applyEntityFlyoutSimulationFromUrl(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  if (params.get(ENTITY_SIMULATION_URL_PARAM) !== '1') {
    return;
  }
  window.localStorage.setItem(ENTITY_FLYOUT_SIMULATION_LOCAL_STORAGE_KEY, 'true');
  params.delete(ENTITY_SIMULATION_URL_PARAM);
  const next = params.toString();
  const url = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', url);
}

/**
 * Whether the entity flyout simulation is on. Local storage overrides Advanced Settings when set
 * to "true", "1", "false", or "0" so demos work without the server-registered UI setting.
 */
export function readEntityFlyoutSimulationEnabled(uiSettings: IUiSettingsClient): boolean {
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(ENTITY_FLYOUT_SIMULATION_LOCAL_STORAGE_KEY);
    if (raw === 'true' || raw === '1') {
      return true;
    }
    if (raw === 'false' || raw === '0') {
      return false;
    }
  }
  try {
    return Boolean(uiSettings.get(ENTITY_FLYOUT_SIMULATION_UI_SETTING));
  } catch {
    // Setting may be missing if this Kibana build does not register discover:entityFlyoutSimulation.
    return false;
  }
}
