/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaults, flow } from 'lodash';
import { SerializableRecord } from '@kbn/utility-types';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { ControlGroupSerializedState } from '@kbn/controls-plugin/common';
import { ControlGroupAttributes } from '../../types';

/**
 * Transform functions for serialized controls state.
 */
export const transformControlsState: (
  serializedControlState: string
) => ControlGroupAttributes['controls'] = flow(
  JSON.parse,
  transformControlObjectToArray,
  transformControlsWidthAuto,
  transformControlExplicitInput,
  transformControlsSetDefaults
);

export function transformControlObjectToArray(controls: ControlGroupSerializedState['controls']) {
  return Object.entries(controls).map(([id, control]) => ({ id, ...control }));
}

export function transformControlsWidthAuto(controls: SerializableRecord[]) {
  return controls.map((control) => {
    if (control.width === 'auto') {
      return { ...control, width: DEFAULT_CONTROL_WIDTH, grow: true };
    }
    return control;
  });
}

export function transformControlExplicitInput(
  controls: SerializableRecord[]
): SerializableRecord[] {
  return controls.map(({ explicitInput, ...control }) => ({
    controlConfig: explicitInput,
    ...control,
  }));
}

// TODO We may want to remove setting defaults in the future
export function transformControlsSetDefaults(controls: SerializableRecord[]) {
  return controls.map((control) =>
    defaults(control, { grow: DEFAULT_CONTROL_GROW, width: DEFAULT_CONTROL_WIDTH })
  );
}
