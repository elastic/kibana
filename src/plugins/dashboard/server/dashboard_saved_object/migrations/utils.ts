/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { EmbeddableInput, SavedObjectEmbeddableInput } from '@kbn/embeddable-plugin/common';
import type { SavedDashboardPanel } from '../schema';
import type { DashboardPanelState } from '../../../common';

export function convertSavedDashboardPanelToPanelState<
  TEmbeddableInput extends EmbeddableInput | SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
>(savedDashboardPanel: SavedDashboardPanel): DashboardPanelState<TEmbeddableInput> {
  return {
    type: savedDashboardPanel.type,
    gridData: savedDashboardPanel.gridData,
    panelRefName: savedDashboardPanel.panelRefName,
    explicitInput: {
      id: savedDashboardPanel.panelIndex,
      ...(savedDashboardPanel.id !== undefined && { savedObjectId: savedDashboardPanel.id }),
      ...(savedDashboardPanel.title !== undefined && { title: savedDashboardPanel.title }),
      ...savedDashboardPanel.embeddableConfig,
    } as TEmbeddableInput,
    version: savedDashboardPanel.version,
  };
}

export function convertPanelStateToSavedDashboardPanel(
  panelState: DashboardPanelState
): SavedDashboardPanel {
  const savedObjectId = (panelState.explicitInput as SavedObjectEmbeddableInput).savedObjectId;
  const panelIndex = panelState.explicitInput.id;
  return {
    type: panelState.type,
    gridData: {
      ...panelState.gridData,
      i: panelIndex,
    },
    panelIndex,
    embeddableConfig: omit(panelState.explicitInput, ['id', 'savedObjectId', 'title']),
    ...(panelState.explicitInput.title !== undefined && { title: panelState.explicitInput.title }),
    ...(savedObjectId !== undefined && { id: savedObjectId }),
    ...(panelState.panelRefName !== undefined && { panelRefName: panelState.panelRefName }),
    ...(panelState.version !== undefined && { version: panelState.version }),
  };
}
