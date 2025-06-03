/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from '@kbn/presentation-publishing';
import { omit } from 'lodash';
import {
  ControlGroupRuntimeState,
  ControlGroupSerializedState,
  DEFAULT_AUTO_APPLY_SELECTIONS,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
} from '../../../common';

export const defaultRuntimeState = {
  labelPosition: DEFAULT_CONTROL_LABEL_POSITION,
  chainingSystem: DEFAULT_CONTROL_CHAINING,
  autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
  ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
};

/**
 * @deprecated use controlGroupApi.serializeState
 * Converts runtime state to serialized state
 * Only use for BWC when runtime state needs to be converted outside of ControlGroup api
 */
export function serializeRuntimeState(
  runtimeState: Partial<ControlGroupRuntimeState>
): SerializedPanelState<ControlGroupSerializedState> {
  return {
    rawState: {
      ...defaultRuntimeState,
      ...omit(runtimeState, ['initialChildControlState']),
      controls: Object.entries(runtimeState?.initialChildControlState ?? {}).map(
        ([controlId, value]) => {
          const { grow, order, type, width, ...controlConfig } = value;
          return {
            id: controlId,
            grow,
            order,
            type,
            width,
            controlConfig,
          };
        }
      ),
    },
  };
}
