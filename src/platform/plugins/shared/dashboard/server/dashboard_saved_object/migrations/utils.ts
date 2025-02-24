/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { SavedDashboardPanel } from '../schema';
import type { DashboardPanelState } from '../../../common';

export function convertSavedDashboardPanelToPanelState<PanelState = object>(
  savedDashboardPanel: SavedDashboardPanel
): DashboardPanelState<PanelState> {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    panelRefName: savedDashboardPanel.panelRefName,
    explicitInput: {
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    } as PanelState,
    version: savedDashboardPanel.version,
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelId: string,
  panelState: DashboardPanelState
): SavedDashboardPanel {
  const savedObjectId = (panelState.explicitInput as { savedObjectId?: string }).savedObjectId;
  const title = (panelState.explicitInput as { title?: string }).title;
  return {
    type: panelState.type,
    gridData: {
      ...panelState.gridData,
      i: panelId,
    },
    panelIndex: panelId,
    embeddableConfig: omit(
      panelState.explicitInput as { id: string; savedObjectId?: string; title?: string },
      ['id', 'savedObjectId', 'title']
    ),
    ...(title !== undefined && { title }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
    ...(panelState.panelRefName !== undefined && { panelRefName: panelState.panelRefName }),
    ...(panelState.version !== undefined && { version: panelState.version }),
  };
}
