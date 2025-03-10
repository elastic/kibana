/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { Serializable, SerializableArray, SerializableRecord } from '@kbn/utility-types';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
import { ControlGroupAttributes } from '../../types';

/**
 * Transform functions for controls state.
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

function isValidControl(control: Serializable): control is SerializableRecord {
  return typeof control === 'object' && control !== null && 'type' in control;
}

export function transformControlObjectToArray(controls: SerializableRecord): SerializableArray {
  return Object.entries(controls).map(([id, control]) =>
    isValidControl(control) ? { id, ...control } : { id }
  );
}

export function transformControlsWidthAuto(controls: SerializableArray): SerializableArray {
  return controls.filter(isValidControl).map((control) => {
    if (control.width === 'auto') {
      return { ...control, width: DEFAULT_CONTROL_WIDTH, grow: true };
    }
    return control;
  });
}

export function transformControlExplicitInput(controls: SerializableArray): SerializableArray {
  return controls.filter(isValidControl).map(({ explicitInput, ...control }) => ({
    controlConfig: explicitInput,
    ...control,
  }));
}

// TODO We may want to remove setting defaults in the future
export function transformControlsSetDefaults(controls: SerializableArray): SerializableArray {
  return controls.filter(isValidControl).map((control) => ({
    width: DEFAULT_CONTROL_WIDTH,
    grow: DEFAULT_CONTROL_GROW,
    ...control,
  }));
}
