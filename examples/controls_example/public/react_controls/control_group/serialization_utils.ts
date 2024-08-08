/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { DefaultDataControlState } from '../data_controls/types';
import {
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelsState,
  ControlPanelState,
  SerializedControlPanelState,
} from './types';

export const deserializeControlGroup = (
  state: SerializedPanelState<ControlGroupSerializedState>
): ControlGroupRuntimeState => {
  const panels: ControlPanelsState<SerializedControlPanelState> = JSON.parse(
    state.rawState.panelsJSON
  );
  const ignoreParentSettings = JSON.parse(state.rawState.ignoreParentSettingsJSON);

  /** Flatten the state of each panel by removing `explicitInput` */
  const flattenedPanels: ControlPanelsState<ControlPanelState> = Object.keys(panels).reduce(
    (prev, panelId) => {
      const currentPanel: SerializedControlPanelState = panels[panelId];
      const currentPanelExplicitInput = panels[panelId].explicitInput;
      return {
        ...prev,
        [panelId]: { ...omit(currentPanel, 'explicitInput'), ...currentPanelExplicitInput },
      };
    },
    {}
  );

  /** Inject data view references into each individual control */
  const references = state.references ?? [];
  references.forEach((reference) => {
    const referenceName = reference.name;
    const panelId = referenceName.substring('controlGroup_'.length, referenceName.lastIndexOf(':'));
    if (flattenedPanels[panelId]) {
      // if the panel has a reference to a data view, then it is a data control so cast it to the proper type
      (flattenedPanels[panelId] as ControlPanelState<DefaultDataControlState>).dataViewId =
        reference.id;
    }
  });

  return {
    ...omit(state.rawState, ['panelsJSON', 'ignoreParentSettingsJSON']),
    initialChildControlState: flattenedPanels,
    ignoreParentSettings,
    autoApplySelections:
      typeof state.rawState.showApplySelections === 'boolean'
        ? !state.rawState.showApplySelections
        : true, // Rename "showApplySelections" to "autoApplySelections"
    labelPosition: state.rawState.controlStyle, // Rename "controlStyle" to "labelPosition"
    defaultControlGrow: DEFAULT_CONTROL_GROW,
    defaultControlWidth: DEFAULT_CONTROL_WIDTH,
    settings: state.rawState.settings,
  };
};
