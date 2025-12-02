/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { ControlsGroupState } from '@kbn/controls-schemas';
import type { ControlGroupRuntimeState, ControlPanelsState } from '../../../common';

export const deserializeControlGroup = (
  state: ControlsGroupState
): ControlGroupRuntimeState => {
  const initialChildControlState: ControlPanelsState = {};
  (state.controls ?? []).forEach((controlSeriailizedState) => {
    const { controlConfig, id, ...rest } = controlSeriailizedState;
    initialChildControlState[id ?? uuidv4()] = {
      ...rest,
      ...(controlConfig ?? {}),
    };
  });

  return {
    ...state,
    initialChildControlState,
  };
};
