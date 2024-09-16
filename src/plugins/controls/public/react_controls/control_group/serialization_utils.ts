/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import {
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  ControlPanelState,
  ControlPanelsState,
} from './types';
import { parseReferenceName } from '../controls/data_controls/reference_name_utils';

export const deserializeControlGroup = (
  state: SerializedPanelState<ControlGroupSerializedState>
): ControlGroupRuntimeState => {
  const { panels } = state.rawState;

  const panelsMap: ControlPanelsState<ControlPanelState> = {};
  panels.forEach(({ id, ...rest }) => {
    panelsMap![id] = rest;
  });

  /** Inject data view references into each individual control */
  const references = state.references ?? [];
  references.forEach((reference) => {
    const referenceName = reference.name;
    const { controlId } = parseReferenceName(referenceName);
    if (panelsMap[controlId]) {
      panelsMap[controlId].dataViewId = reference.id;
    }
  });

  /** Flatten the state of each panel by removing `embeddableConfig` */
  const flattenedPanels = Object.keys(panelsMap).reduce((prev, panelId) => {
    const currentPanel = panelsMap[panelId];
    const currentPanelExplicitInput = panelsMap[panelId].embeddableConfig;
    return {
      ...prev,
      [panelId]: { ...omit(currentPanel, 'embeddableConfig'), ...currentPanelExplicitInput },
    };
  }, {});

  return {
    ...omit(state.rawState, ['controlStyle', 'showApplySelections']),
    initialChildControlState: flattenedPanels,
    autoApplySelections:
      typeof state.rawState.showApplySelections === 'boolean'
        ? !state.rawState.showApplySelections
        : false, // Rename "showApplySelections" to "autoApplySelections"
    labelPosition: state.rawState.controlStyle, // Rename "controlStyle" to "labelPosition"
  };
};
