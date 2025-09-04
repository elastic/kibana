/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow, omit } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { SerializableRecord } from '@kbn/utility-types';

import { embeddableService, logger } from '../../../../kibana_services';

/**
 * Transform functions for serialized controls state.
 */
export const transformControlsState: (
  serializedControlState: string,
  references: Reference[]
) => ControlsGroupState['controls'] = (serializedControlState, references) => {
  const result = flow(
    JSON.parse,
    transformControlObjectToArray,
    dropControlDisplayProperties,
    transformControlProperties
  )(serializedControlState);
  return injectControlReferences(result, references);
};

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

export function transformControlProperties(
  controls: Array<SerializableRecord & { order?: number }>
): ControlsGroupState['controls'] {
  return controls
    .sort(({ order: orderA = 0 }, { order: orderB = 0 }) => orderA - orderB)
    .map(({ explicitInput, id, type }) => {
      return {
        id,
        type,
        ...(explicitInput as SerializableRecord),
      };
    }) as ControlsGroupState['controls'];
}

function injectControlReferences(
  controls: ControlsGroupState['controls'],
  references: Reference[]
): ControlsGroupState['controls'] {
  const transformedControls: ControlsGroupState['controls'] = [];

  controls.forEach((control) => {
    const transforms = embeddableService.getTransforms(control.type);
    try {
      if (transforms?.transformOut) {
        transformedControls.push(
          transforms.transformOut(control, references) as ControlsGroupState['controls'][number]
        );
      } else {
        transformedControls.push(control);
      }
    } catch (transformOutError) {
      // do not prevent read on transformOutError
      logger.warn(
        `Unable to transform "${control.type}" embeddable state on read. Error: ${transformOutError.message}`
      );
    }
  });

  return transformedControls;
}
