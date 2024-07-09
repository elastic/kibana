/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { DefaultControlApi } from '../types';
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
        : false,
    labelPosition: state.rawState.controlStyle, // Rename "controlStyle" to "labelPosition"
    defaultControlGrow: DEFAULT_CONTROL_GROW,
    defaultControlWidth: DEFAULT_CONTROL_WIDTH,
  };
};

export const serializeControlGroup = (
  children: {
    [key: string]: DefaultControlApi;
  },
  idsInOrder: string[],
  state: Omit<
    ControlGroupRuntimeState,
    | 'anyChildHasUnsavedChanges'
    | 'defaultControlGrow'
    | 'defaultControlWidth'
    | 'initialChildControlState'
  >
): SerializedPanelState<ControlGroupSerializedState> => {
  let references: Reference[] = [];

  /** Re-add the `explicitInput` layer on serialize so control group saved object retains shape */
  const explicitInputPanels = Object.keys(children).reduce((prev, panelId) => {
    const child: DefaultControlApi = children[panelId];
    const type = child.type;
    const {
      rawState: { grow, width, ...rest },
      references: childReferences,
    } = child.serializeState();

    if (childReferences && childReferences.length > 0) {
      references = [...references, ...childReferences];
    }

    /**
     * Note: With legacy control embeddables, `grow` and `width` were duplicated under
     * explicit input - this is no longer the case.
     */
    return {
      ...prev,
      [panelId]: { grow, order: idsInOrder.indexOf(panelId), type, width, explicitInput: rest },
    };
  }, {});

  return {
    rawState: {
      ...omit(state, ['ignoreParentSettings', 'labelPosition']),
      controlStyle: state.labelPosition, // Rename "labelPosition" to "controlStyle"
      showApplySelections: !state.autoApplySelections,
      ignoreParentSettingsJSON: JSON.stringify(state.ignoreParentSettings),
      panelsJSON: JSON.stringify(explicitInputPanels),
    },
    references,
  };
};
