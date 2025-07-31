/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { SerializedPanelState } from '@kbn/presentation-publishing';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { ControlGroupRuntimeState, ControlPanelsState } from '../../../common';
import { parseReferenceName } from '../../controls/data_controls/reference_name_utils';

export const deserializeControlGroup = (
  state: SerializedPanelState<ControlsGroupState>
): ControlGroupRuntimeState => {
  const initialChildControlState: ControlPanelsState = {};
  (state.rawState.controls ?? []).forEach((controlSeriailizedState) => {
    const { controlConfig, id, ...rest } = controlSeriailizedState;
    initialChildControlState[id ?? uuidv4()] = {
      ...rest,
      ...(controlConfig ?? {}),
    };
  });

  // Inject data view references into each individual control
  // TODO move reference injection into control factory to avoid leaking implemenation details like dataViewId to ControlGroup
  const references = state.references ?? [];
  references.forEach((reference) => {
    const referenceName = reference.name;
    const { controlId } = parseReferenceName(referenceName);
    if (initialChildControlState[controlId]) {
      (initialChildControlState[controlId] as { dataViewId?: string }).dataViewId = reference.id;
    }
  });

  return {
    ...state.rawState,
    initialChildControlState,
  };
};
