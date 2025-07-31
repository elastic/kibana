/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { ControlsGroupState } from '@kbn/controls-schemas';
import { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';

export function transformControlGroupIn(
  controlGroupInput?: ControlsGroupState
): DashboardSavedObjectAttributes['controlGroupInput'] | undefined {
  if (!controlGroupInput) {
    return;
  }
  return flow(
    transformControlStyle,
    transformShowApplySelections,
    transformIgnoreParentSettings,
    transformPanelsJSON
  )(controlGroupInput);
}

function transformControlStyle(controlGroupInput: ControlsGroupState) {
  const { labelPosition, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    controlStyle: labelPosition,
  };
}

function transformShowApplySelections(controlGroupInput: ControlsGroupState) {
  const { autoApplySelections, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    showApplySelections: !autoApplySelections,
  };
}

function transformIgnoreParentSettings(controlGroupInput: ControlsGroupState) {
  const { ignoreParentSettings, ...restControlGroupInput } = controlGroupInput;
  return {
    ...restControlGroupInput,
    ignoreParentSettingsJSON: JSON.stringify(ignoreParentSettings),
  };
}

function transformPanelsJSON(controlGroupInput: ControlsGroupState) {
  const { controls, ...restControlGroupInput } = controlGroupInput;
  const updatedControls = Object.fromEntries(
    controls.map(({ controlConfig, id = uuidv4(), ...restOfControl }) => {
      return [id, { ...restOfControl, explicitInput: controlConfig }];
    })
  );
  return {
    ...restControlGroupInput,
    panelsJSON: JSON.stringify(updatedControls),
  };
}
