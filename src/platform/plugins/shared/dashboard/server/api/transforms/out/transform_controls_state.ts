/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { SerializableRecord } from '@kbn/utility-types';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import type { DashboardPinnedPanelsState as DashboardControlsState } from '../../../../common';
import type { StoredControlGroupInput, StoredControlState } from '../../../dashboard_saved_object';
import { embeddableService, logger } from '../../../kibana_services';

/**
 * Transform functions for serialized controls state.
 */
export const transformControlsState: (
  serializedControlState: string,
  containerReferences: Reference[]
) => DashboardControlsState = (serializedControlState, containerReferences) => {
  const state = flow(
    JSON.parse,
    transformControlObjectToArray,
    transformControlProperties
  )(serializedControlState);
  return injectControlReferences(state, containerReferences);
};

export function transformControlObjectToArray(
  controls: StoredControlGroupInput['panels']
): Array<StoredControlState> {
  return Object.entries(controls).map(([id, control]) => ({ id, ...control }));
}

export function transformControlProperties(controls: Array<StoredControlState>) {
  return controls
    .sort(({ order: orderA = 0 }, { order: orderB = 0 }) => orderA - orderB)
    .map(({ explicitInput, id, type, grow, width }) => {
      return {
        uid: id,
        type,
        ...(grow !== undefined && { grow }),
        ...(width !== undefined && { width }),
        config: explicitInput as SerializableRecord,
      };
    });
}

function injectControlReferences(
  controls: ControlsGroupState,
  containerReferences: Reference[]
): DashboardControlsState {
  const transformedControls: DashboardControlsState = [];

  controls.forEach((control) => {
    const transforms = embeddableService.getTransforms(control.type);
    const { config, ...rest } = control;
    if (transforms?.transformOut) {
      try {
        transformedControls.push({
          ...rest,
          config: transforms.transformOut(config, [], containerReferences, control.uid),
        } as DashboardControlsState[number]);
      } catch (transformOutError) {
        // do not prevent read on transformOutError
        logger.warn(
          `Unable to transform "${control.type}" embeddable state on read. Error: ${transformOutError.message}`
        );
      }
    } else {
      transformedControls.push({ ...rest, config } as DashboardControlsState[number]);
    }
  });
  return transformedControls;
}
