/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { ControlGroupRuntimeState, ControlGroupSerializedState } from './types';

export const deserializeControlGroup = (
  state: SerializedPanelState<ControlGroupSerializedState>
): ControlGroupRuntimeState => {
  const panels = JSON.parse(state.rawState.panelsJSON);
  const ignoreParentSettings = JSON.parse(state.rawState.ignoreParentSettingsJSON);

  /** Inject data view references into each individual control */
  const references = state.references ?? [];
  references.forEach((reference) => {
    const referenceName = reference.name;
    const panelId = referenceName.substring('controlGroup_'.length, referenceName.lastIndexOf(':'));
    if (panels[panelId]) {
      panels[panelId].dataViewId = reference.id;
    }
  });

  /** Flatten the state of each panel by removing `explicitInput` */
  const flattenedPanels = Object.keys(panels).reduce((prev, panelId) => {
    const currentPanel = panels[panelId];
    const currentPanelExplicitInput = panels[panelId].explicitInput;
    return {
      ...prev,
      [panelId]: { ...omit(currentPanel, 'explicitInput'), ...currentPanelExplicitInput },
    };
  }, {});

  return {
    ...omit(state.rawState, ['panelsJSON', 'ignoreParentSettingsJSON']),
    initialChildControlState: flattenedPanels,
    ignoreParentSettings,
    autoApplySelections:
      typeof state.rawState.showApplySelections === 'boolean'
        ? !state.rawState.showApplySelections
        : false, // Rename "showApplySelections" to "autoApplySelections"
    labelPosition: state.rawState.controlStyle, // Rename "controlStyle" to "labelPosition"
  };
};
