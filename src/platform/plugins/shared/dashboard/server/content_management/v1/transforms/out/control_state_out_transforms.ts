/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { SerializableRecord } from '@kbn/utility-types';
import { DEFAULT_CONTROL_GROW, DEFAULT_CONTROL_WIDTH } from '@kbn/controls-plugin/common';
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
  transformControlsSetDefaults,
  transformControlProperties
);

export function transformControlObjectToArray(controls: Record<string, SerializableRecord>) {
  return Object.entries(controls).map(([id, control]) => ({ id, ...control }));
}

/**
 * Some controls were serialized with width set to 'auto'. This function will transform those controls
 * to have the default width and grow set to true. See @link https://github.com/elastic/kibana/issues/211113.
 */
export function transformControlsWidthAuto(controls: SerializableRecord[]) {
  return controls.map((control) => {
    if (control.width === 'auto') {
      return { ...control, width: DEFAULT_CONTROL_WIDTH, grow: true };
    }
    return control;
  });
}

// TODO We may want to remove setting defaults in the future
export function transformControlsSetDefaults(controls: SerializableRecord[]) {
  return controls.map((control) => ({
    grow: DEFAULT_CONTROL_GROW,
    width: DEFAULT_CONTROL_WIDTH,
    ...control,
  }));
}

export function transformControlProperties(controls: SerializableRecord[]): SerializableRecord[] {
  return controls.map(({ explicitInput, id, type, width, grow, order }) => ({
    controlConfig: explicitInput,
    id,
    grow,
    order,
    type,
    width,
  }));
}
