/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  convertSavedDashboardPanelToPanelState,
  convertPanelStateToSavedDashboardPanel,
} from '../../../common/embeddable/embeddable_saved_object_converters';
import type { SavedDashboardPanel, DashboardPanelMap } from '../../types';

export const convertSavedPanelsToPanelMap = (panels?: SavedDashboardPanel[]): DashboardPanelMap => {
  const panelsMap: DashboardPanelMap = {};
  panels?.forEach((panel, idx) => {
    panelsMap![panel.panelIndex ?? String(idx)] = convertSavedDashboardPanelToPanelState(panel);
  });
  return panelsMap;
};

export const convertPanelMapToSavedPanels = (panels: DashboardPanelMap, version: string) => {
  return Object.values(panels).map((panel) =>
    convertPanelStateToSavedDashboardPanel(panel, version)
  );
};
