/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

import type { ControlGroupInputSavedObjectAttributes } from '@kbn/dashboard-plugin/server';

import {
  type ControlGroupRuntimeState,
  type ControlPanelState,
  type SerializedControlState,
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_SHOW_APPLY_SELECTIONS,
} from '../../common';

export const getDefaultControlGroupState = (): SerializableControlGroupState => ({
  panels: {},
  labelPosition: DEFAULT_CONTROL_LABEL_POSITION,
  chainingSystem: DEFAULT_CONTROL_CHAINING,
  autoApplySelections: DEFAULT_SHOW_APPLY_SELECTIONS,
  ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
});

// using SerializableRecord to force type to be read as serializable
export type SerializableControlGroupState = SerializableRecord &
  Omit<
    ControlGroupRuntimeState,
    'initialChildControlState' | 'editorConfig' // editor config is not persisted
  > & {
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

export const controlGroupSavedObjectStateToSerializableRuntimeState = (
  savedObjectState: ControlGroupInputSavedObjectAttributes
): SerializableControlGroupState => {
  const defaultControlGroupInput = getDefaultControlGroupState();
  return {
    chainingSystem:
      (savedObjectState?.chainingSystem as SerializableControlGroupState['chainingSystem']) ??
      defaultControlGroupInput.chainingSystem,
    labelPosition:
      (savedObjectState?.controlStyle as SerializableControlGroupState['labelPosition']) ??
      defaultControlGroupInput.labelPosition,
    autoApplySelections: !savedObjectState?.showApplySelections,
    ignoreParentSettings: safeJSONParse(savedObjectState?.ignoreParentSettingsJSON) ?? {},
    panels: safeJSONParse(savedObjectState?.panelsJSON) ?? {},
  };
};

export const serializableRuntimeStateToControlGroupSavedObjectState = (
  serializable: SerializableRecord // It is safe to treat this as SerializableControlGroupState
): ControlGroupInputSavedObjectAttributes => {
  return {
    controlStyle: serializable.labelPosition as SerializableControlGroupState['labelPosition'],
    chainingSystem: serializable.chainingSystem as SerializableControlGroupState['chainingSystem'],
    showApplySelections: !Boolean(serializable.autoApplySelections),
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
