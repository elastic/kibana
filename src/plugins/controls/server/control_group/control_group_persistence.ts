/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializableRecord } from '@kbn/utility-types';

import { ControlGroupSavedObjectState, SerializableControlGroupState } from './types';
import {
  DEFAULT_CONTROL_CHAINING,
  DEFAULT_CONTROL_LABEL_POSITION,
  DEFAULT_IGNORE_PARENT_SETTINGS,
  DEFAULT_AUTO_APPLY_SELECTIONS,
} from '../../common';

export const getDefaultControlGroupState = (): SerializableControlGroupState => ({
  panels: {},
  labelPosition: DEFAULT_CONTROL_LABEL_POSITION,
  chainingSystem: DEFAULT_CONTROL_CHAINING,
  autoApplySelections: DEFAULT_AUTO_APPLY_SELECTIONS,
  ignoreParentSettings: DEFAULT_IGNORE_PARENT_SETTINGS,
});

const safeJSONParse = <OutType>(jsonString?: string): OutType | undefined => {
  if (!jsonString && typeof jsonString !== 'string') return;
  try {
    return JSON.parse(jsonString) as OutType;
  } catch {
    return;
  }
};

export const controlGroupSavedObjectStateToSerializableRuntimeState = (
  savedObjectState: ControlGroupSavedObjectState
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
): ControlGroupSavedObjectState => {
  return {
    controlStyle: serializable.labelPosition as SerializableControlGroupState['labelPosition'],
    chainingSystem: serializable.chainingSystem as SerializableControlGroupState['chainingSystem'],
    showApplySelections: !Boolean(serializable.autoApplySelections),
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
