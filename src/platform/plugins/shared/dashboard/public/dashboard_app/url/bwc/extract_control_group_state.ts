/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import {
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROLS_LABEL_POSITION,
} from '@kbn/controls-constants';
import { serializeRuntimeState } from '@kbn/controls-plugin/public';
import { DashboardState } from '../../../../common';

export function extractControlGroupState(state: {
  [key: string]: unknown;
}): DashboardState['controlGroupInput'] {
  if (state.controlGroupState && typeof state.controlGroupState === 'object') {
    // URL state created in 8.16 through 8.18 passed control group runtime state in with controlGroupState key
    return serializeRuntimeState(state.controlGroupState).rawState;
  }

  if (!state.controlGroupInput || typeof state.controlGroupInput !== 'object') return;

  const controlGroupInput = state.controlGroupInput as { [key: string]: unknown };

  let autoApplySelections: ControlsGroupState['autoApplySelections'] =
    DEFAULT_AUTO_APPLY_SELECTIONS;
  if (typeof controlGroupInput.autoApplySelections === 'boolean') {
    autoApplySelections = controlGroupInput.autoApplySelections;
  } else if (typeof controlGroupInput.showApplySelections === 'boolean') {
    // <8.16 autoApplySelections exported as !showApplySelections
    autoApplySelections = !controlGroupInput.showApplySelections;
  }

  let controls: ControlsGroupState['controls'] = [];
  if (Array.isArray(controlGroupInput.controls)) {
    controls = controlGroupInput.controls;
  } else if (controlGroupInput.panels && typeof controlGroupInput.panels === 'object') {
    // <8.16 controls exported as panels
    const panels = controlGroupInput.panels as {
      [key: string]: { [key: string]: unknown } | undefined;
    };
    controls = Object.keys(controlGroupInput.panels).map((controlId) => {
      const { explicitInput, ...restOfControlState } = panels[controlId] ?? {};
      return {
        ...restOfControlState,
        controlConfig: explicitInput,
      };
    }) as ControlsGroupState['controls'];
  }

  let labelPosition: ControlsGroupState['labelPosition'] = DEFAULT_CONTROLS_LABEL_POSITION;
  if (typeof controlGroupInput.labelPosition === 'string') {
    labelPosition = controlGroupInput.labelPosition as ControlsGroupState['labelPosition'];
  } else if (typeof controlGroupInput.controlStyle === 'string') {
    // <8.16 labelPosition exported as controlStyle
    labelPosition = controlGroupInput.controlStyle as ControlsGroupState['labelPosition'];
  }

  return {
    autoApplySelections,
    controls,
    chainingSystem: controlGroupInput.chainingSystem as ControlsGroupState['chainingSystem'],
    labelPosition,
    ...(controlGroupInput.ignoreParentSettings &&
    typeof controlGroupInput.ignoreParentSettings === 'object'
      ? {
          ignoreParentSettings:
            controlGroupInput.ignoreParentSettings as ControlsGroupState['ignoreParentSettings'],
        }
      : {}),
  };
}
