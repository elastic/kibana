/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';
import { ControlGroupRuntimeState, ControlPanelState, SerializedControlState } from '../../common';

// using SerializableRecord to force type to be read as serializable
export type SerializableControlGroupState = SerializableRecord &
  Omit<
    ControlGroupRuntimeState,
    'initialChildControlState' | 'editorConfig' // editor config is not persisted
  > & {
    panels: Record<string, ControlPanelState<SerializedControlState>> | {};
  };

export type ControlGroupSavedObjectState = SerializableRecord & {
  chainingSystem: SerializableControlGroupState['chainingSystem'];
  controlStyle: SerializableControlGroupState['labelPosition'];
  showApplySelections: boolean;
  ignoreParentSettingsJSON: string;
  panelsJSON: string;
};

export interface ControlGroupTelemetry {
  total: number;
  chaining_system: {
    [key: string]: number;
  };
  label_position: {
    [key: string]: number;
  };
  ignore_settings: {
    [key: string]: number;
  };
  by_type: {
    [key: string]: {
      total: number;
      details: { [key: string]: number };
    };
  };
}
