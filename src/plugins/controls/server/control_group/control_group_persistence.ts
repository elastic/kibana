/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

import {
  DEFAULT_CONTROL_STYLE,
  type ControlGroupRuntimeState,
  type ControlGroupSerializedState,
  type ControlPanelState,
  type SerializedControlState,
} from '../../common';

export const getDefaultControlGroupState = (): SerializableControlGroupState => ({
  panels: {},
  labelPosition: DEFAULT_CONTROL_STYLE,
  chainingSystem: 'HIERARCHICAL',
  autoApplySelections: true,
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
});

// using SerializableRecord to force type to be read as serializable
export type SerializableControlGroupState = SerializableRecord &
  Omit<
    ControlGroupRuntimeState,
    'initialChildControlState' | 'ignoreParentSettings' | 'editorConfig' // editor config is not persisted
  > & {
    ignoreParentSettings: Record<string, boolean>;
    panels: Record<string, ControlPanelState<SerializedControlState>> | {};
  };

const safeJSONParse = <OutType>(jsonString?: string): OutType | undefined => {
  if (!jsonString && typeof jsonString !== 'string') return;
  try {
    return JSON.parse(jsonString) as OutType;
  } catch {
    return;
  }
};

export const controlGroupSerializedStateToSerializableRuntimeState = (
  serializedState: ControlGroupSerializedState
): SerializableControlGroupState => {
  const defaultControlGroupInput = getDefaultControlGroupState();
  return {
    chainingSystem: serializedState?.chainingSystem,
    labelPosition: serializedState?.controlStyle ?? defaultControlGroupInput.labelPosition,
    autoApplySelections: !serializedState?.showApplySelections,
    ignoreParentSettings: safeJSONParse(serializedState?.ignoreParentSettingsJSON) ?? {},
    panels: safeJSONParse(serializedState?.panelsJSON) ?? {},
  };
};

export const serializableRuntimeStateToControlGroupSerializedState = (
  serializable: SerializableControlGroupState
): ControlGroupSerializedState => {
  return {
    controlStyle: serializable.labelPosition as ControlGroupRuntimeState['labelPosition'],
    chainingSystem: serializable.chainingSystem as ControlGroupRuntimeState['chainingSystem'],
    showApplySelections: !Boolean(serializable.autoApplySelections),
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
