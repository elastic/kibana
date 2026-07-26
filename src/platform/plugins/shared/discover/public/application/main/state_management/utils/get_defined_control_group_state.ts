/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';

/**
 * Returns the control group state if it is defined and has at least one control, otherwise returns undefined.
 * @param controlGroupState
 */
export const getDefinedControlGroupState = (
  controlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined
): ControlPanelsState<OptionsListESQLControlState> | undefined => {
  if (controlGroupState && Object.keys(controlGroupState).length > 0) {
    return controlGroupState;
  }
  return undefined;
};
