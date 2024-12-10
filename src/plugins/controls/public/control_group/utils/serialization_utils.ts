/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';

import { SerializedPanelState } from '@kbn/presentation-containers';
import type { ControlGroupRuntimeState, ControlGroupSerializedState } from '../../../common';
import { parseReferenceName } from '../../controls/data_controls/reference_name_utils';

export const deserializeControlGroup = (
  state: SerializedPanelState<ControlGroupSerializedState>
): ControlGroupRuntimeState => {
  const { controls } = state.rawState;
  const controlsMap = Object.fromEntries(controls.map(({ id, ...rest }) => [id, rest]));

  /** Inject data view references into each individual control */
  const references = state.references ?? [];
  references.forEach((reference) => {
    const referenceName = reference.name;
    const { controlId } = parseReferenceName(referenceName);
    if (controlsMap[controlId]) {
      controlsMap[controlId].dataViewId = reference.id;
    }
  });

  /** Flatten the state of each control by removing `controlConfig` */
  const flattenedControls = Object.keys(controlsMap).reduce((prev, controlId) => {
    const currentControl = controlsMap[controlId];
    const currentControlExplicitInput = controlsMap[controlId].controlConfig;
    return {
      ...prev,
      [controlId]: { ...omit(currentControl, 'controlConfig'), ...currentControlExplicitInput },
    };
  }, {});

  return {
    ...state.rawState,
    initialChildControlState: flattenedControls,
  };
};
