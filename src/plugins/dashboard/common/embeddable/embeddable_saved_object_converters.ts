/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { omit } from 'lodash';
import { DashboardPanelState, SavedDashboardPanel } from '../types';
import { SavedObjectEmbeddableInput } from '../../../embeddable/common/';

export function convertSavedDashboardPanelToPanelState(
  savedDashboardPanel: SavedDashboardPanel
): DashboardPanelState {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    explicitInput: {
      id: savedDashboardPanel.panelIndex,
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    },
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState,
  version: string
): SavedDashboardPanel {
  const customTitle: string | undefined = panelState.explicitInput.title
    ? (panelState.explicitInput.title as string)
    : undefined;
  const savedObjectId = (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId;
  return {
    version,
    type: panelState.type,
    gridData: panelState.gridData,
    panelIndex: panelState.explicitInput.id,
    embeddableConfig: omit(panelState.explicitInput, ['id', 'savedObjectId', 'title']),
    ...(customTitle && { title: customTitle }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
  };
}
