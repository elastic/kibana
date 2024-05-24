/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Reference } from '@kbn/content-management-utils';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { omit } from 'lodash';
import { DefaultDataControlState } from '../data_controls/types';
import { DefaultControlState } from '../types';
import { ControlGroupRuntimeState, ControlGroupSerializedState } from './types';

export const deserializeControlGroup = <
  ChildControlState extends DefaultControlState = DefaultControlState
>(
  state: SerializedPanelState<ControlGroupSerializedState>
): ControlGroupRuntimeState<ChildControlState> => {
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
    panels: flattenedPanels,
    ignoreParentSettings,
    defaultControlGrow: DEFAULT_CONTROL_GROW,
    defaultControlWidth: DEFAULT_CONTROL_WIDTH,
    anyChildHasUnsavedChanges: false,
  };
};

const isDataControl = (state: unknown): state is DefaultDataControlState => {
  return typeof (state as DefaultDataControlState).dataViewId === 'string';
};

export const serializeControlGroup = (
  state: Omit<
    ControlGroupRuntimeState,
    'anyChildHasUnsavedChanges' | 'defaultControlGrow' | 'defaultControlWidth'
  >
): SerializedPanelState<ControlGroupSerializedState> => {
  const { panels } = state;
  const references: Reference[] = [];

  /** Re-add the `explicitInput` layer on serialize so control group saved object retains shape */
  const explicitInputPanels = Object.keys(panels).reduce((prev, panelId) => {
    const currentPanel: DefaultControlState | DefaultControlState = panels[panelId];
    const { grow, order, type, width, ...rest } = currentPanel;

    if (isDataControl(currentPanel)) {
      /** All data controls will have a data view ID, so add the data view to the reference array */
      references.push({
        name: `controlGroup_${panelId}:${type}DataView`,
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: currentPanel.dataViewId,
      });
    }

    // Note: `grow` and `width` are no longer duplicated under explicit input - is this a problem?
    return { ...prev, [panelId]: { grow, order, type, width, explicitInput: rest } };
  }, {});

  return {
    rawState: {
      ...omit(state, ['panels', 'ignoreParentSettings']),
      ignoreParentSettingsJSON: JSON.stringify(state.ignoreParentSettings),
      panelsJSON: JSON.stringify(explicitInputPanels),
    },
    references,
  };
};
