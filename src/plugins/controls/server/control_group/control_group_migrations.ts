/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import {
  OPTIONS_LIST_CONTROL,
  type ControlPanelsState,
  type SerializedControlState,
} from '../../common';
import { OptionsListControlState } from '../../common/options_list';
import { SerializableControlGroupState } from './control_group_persistence';

export const makeControlOrdersZeroBased = (state: SerializableControlGroupState) => {
  if (
    state.panels &&
    typeof state.panels === 'object' &&
    Object.keys(state.panels).length > 0 &&
    !Object.values(state.panels).find((panel) => (panel?.order ?? 0) === 0)
  ) {
    // 0th element could not be found. Reorder all panels from 0;
    const newPanels = Object.entries(state.panels)
      .sort(([, a], [, b]) => (a.order > b.order ? 1 : -1))
      .map(([id, panel], index) => {
        panel.order = index;
        return { id, panel };
      })
      .reduce((acc, { id, panel: currentPanel }) => {
        acc[id] = currentPanel;
        return acc;
      }, {} as SerializableRecord & ControlPanelsState<SerializedControlState>);
    state.panels = newPanels;
  }
  return state;
};

/**
 * The UX for the "Allow include/exclude" and "Allow exists query" toggles was removed in 8.7.0 so, to
 * prevent users from getting stuck when migrating from 8.6.0 (when the toggles were introduced) to 8.7.0
 * we must set both the `hideExclude` and `hideExists` keys to `undefined` for all existing options
 * list controls.
 */
export const removeHideExcludeAndHideExists = (state: SerializableControlGroupState) => {
  if (
    state.initialChildControlState &&
    typeof state.initialChildControlState === 'object' &&
    Object.keys(state.initialChildControlState).length > 0
  ) {
    const newPanels = Object.keys(state.panels).reduce((panelAccumulator, panelId) => {
      const panel = (
        state.panels as ControlPanelsState<SerializedControlState<OptionsListControlState>>
      )[panelId];
      if (panel.type === OPTIONS_LIST_CONTROL) {
        const explicitInput = panel.explicitInput;
        delete explicitInput.hideExclude;
        delete explicitInput.hideExists;
      }
      return {
        ...panelAccumulator,
        [panelId]: panel,
      };
    }, {});
    state.initialChildControlState = newPanels;
  }
  return state;
};
