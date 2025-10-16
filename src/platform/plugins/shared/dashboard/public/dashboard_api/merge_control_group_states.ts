/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import { controlHasVariableName } from '@kbn/esql-types';

/**
 * Merges initial control group state with incoming control group state from embeddable packages.
 * Only adds controls from the incoming state that don't already exist based on variable names.
 *
 * @param initialControlGroupInput - The existing control group state from the dashboard
 * @param incomingControlGroup - The incoming embeddable package containing control group state
 * @returns The merged control group state, or undefined if no state is available
 */
export function mergeControlGroupStates(
  initialControlGroupInput: ControlsGroupState | undefined,
  incomingControlGroup: EmbeddablePackageState | undefined
): ControlsGroupState | undefined {
  const incomingControlGroupState = incomingControlGroup?.serializedState?.rawState;
  let mergedControlGroupState: ControlsGroupState | undefined = initialControlGroupInput;

  if (mergedControlGroupState && incomingControlGroupState) {
    // check if the control exists already
    const uniqueControls: ControlsGroupState['controls'] = [];
    const existingControlVariableNames = new Set(
      mergedControlGroupState.controls.map((control) => {
        if (controlHasVariableName(control.controlConfig)) {
          return control.controlConfig.variableName;
        }
      })
    );

    // Checks each incoming control's variable name against existing controls to avoid duplicates
    (incomingControlGroupState as ControlsGroupState).controls.forEach((control) => {
      if (
        controlHasVariableName(control.controlConfig) &&
        !existingControlVariableNames.has(control.controlConfig?.variableName)
      ) {
        uniqueControls.push(control);
      }
    });

    mergedControlGroupState = {
      ...mergedControlGroupState,
      controls: [...uniqueControls, ...mergedControlGroupState.controls],
    };
  } else if (!mergedControlGroupState && incomingControlGroupState) {
    mergedControlGroupState = incomingControlGroupState as ControlsGroupState;
  }

  return mergedControlGroupState;
}
