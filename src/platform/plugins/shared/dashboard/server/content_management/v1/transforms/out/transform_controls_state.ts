/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { SerializableRecord } from '@kbn/utility-types';
import { flow, omit } from 'lodash';

/**
 * Transform functions for serialized controls state.
 */
export const transformControlsState: (
  serializedControlState: string
) => ControlsGroupState['controls'] = flow(
  JSON.parse,
  transformControlObjectToArray,
  dropControlDisplayProperties,
  transformControlProperties
);

export function transformControlObjectToArray(controls: Record<string, SerializableRecord>) {
  return Object.entries(controls).map(([id, control]) => ({ id, ...control }));
}

/**
 * With controls as a panel, the `width` and `grow` attributes are no longer relavant
 */
export function dropControlDisplayProperties(controls: SerializableRecord[]) {
  return controls.map((control) => {
    return { ...omit(control, ['width', 'grow']) };
  });
}

export function transformControlProperties(controls: SerializableRecord[]): SerializableRecord[] {
  return controls.map(({ explicitInput, id, type, order }) => ({
    id,
    order,
    type,
    ...(explicitInput as SerializableRecord),
  }));
}
