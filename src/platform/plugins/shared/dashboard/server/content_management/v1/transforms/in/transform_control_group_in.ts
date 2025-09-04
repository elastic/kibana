/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, omit } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';

export function transformControlGroupIn(
  controlGroupInput?: ControlsGroupState
): DashboardSavedObjectAttributes['controlGroupInput'] | undefined {
  if (!controlGroupInput) {
    return;
  }
  return flow(transformPanelsJSON)(controlGroupInput);
}

function transformPanelsJSON(controlGroupInput: ControlsGroupState) {
  const { controls, ...restControlGroupInput } = controlGroupInput;
  const updatedControls = Object.fromEntries(
    controls.map(({ id = uuidv4(), ...restOfControl }, index) => {
      return [
        id,
        {
          order: index,
          type: restOfControl.type,
          explicitInput: { ...omit(restOfControl, ['order', 'type', 'dataViewId']) },
        },
      ];
    })
  );
  return {
    ...restControlGroupInput,
    panelsJSON: JSON.stringify(updatedControls),
  };
}
