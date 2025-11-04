/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlWidth } from '@kbn/controls-schemas';
import type { DashboardState, DashboardControlsState } from '../../../../common';

interface State816To819 {
  controlGroupState: {
    initialChildControlState: Record<
      string,
      object & {
        grow: boolean;
        order: number;
        type: string;
        width: ControlWidth;
      }
    >;
  };
}

const isState816To819 = (state: unknown): state is State816To819 =>
  Boolean((state as State816To819).controlGroupState?.initialChildControlState);

export function extractControlGroupState(state: {
  [key: string]: unknown;
}): DashboardState['controlGroupInput'] {
  if (isState816To819(state)) {
    // URL state created in 8.16 through 8.18 passed control group runtime state in with controlGroupState key
    return {
      controls: Object.entries(state.controlGroupState.initialChildControlState).map(
        ([controlId, value]) => {
          const { grow, order, type, width, ...controlConfig } = value;
          return {
            id: controlId,
            grow,
            order,
            type,
            width,
            controlConfig,
          };
        }
      ) as DashboardControlsState,
    };
  }

  if (!state.controlGroupInput || typeof state.controlGroupInput !== 'object') return;

  const controlGroupInput = state.controlGroupInput as { [key: string]: unknown };

  let controls: DashboardControlsState = [];
  if (Array.isArray(controlGroupInput.controls)) {
    controls = controlGroupInput.controls;
  } else if (controlGroupInput.panels && typeof controlGroupInput.panels === 'object') {
    // <8.16 controls exported as panels
    const panels = controlGroupInput.panels as {
      [key: string]:
        | { [key: string]: unknown; explicitInput?: { [key: string]: unknown } }
        | undefined;
    };
    controls = Object.keys(controlGroupInput.panels).map((controlId) => {
      const { explicitInput, ...restOfControlState } = panels[controlId] ?? {};
      return {
        ...restOfControlState,
        ...(explicitInput ? { controlConfig: explicitInput } : {}),
      };
    }) as DashboardControlsState;
  }

  return {
    controls,
  };
}
