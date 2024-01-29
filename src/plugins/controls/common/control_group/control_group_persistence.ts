/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';
import { SerializableRecord } from '@kbn/utility-types';

import { v4 } from 'uuid';
import { pick, omit, xor } from 'lodash';

import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_STYLE,
  DEFAULT_CONTROL_WIDTH,
} from './control_group_constants';
import {
  ControlPanelDiffSystems,
  genericControlPanelDiffSystem,
} from './control_group_panel_diff_system';
import { ControlGroupInput } from '..';
import { ControlsPanels, PersistableControlGroupInput, RawControlGroupAttributes } from './types';

const safeJSONParse = <OutType>(jsonString?: string): OutType | undefined => {
  if (!jsonString && typeof jsonString !== 'string') return;
  try {
    return JSON.parse(jsonString) as OutType;
  } catch {
    return;
  }
};

export const getDefaultControlGroupInput = (): Omit<ControlGroupInput, 'id'> => ({
  panels: {},
  defaultControlWidth: DEFAULT_CONTROL_WIDTH,
  defaultControlGrow: DEFAULT_CONTROL_GROW,
  controlStyle: DEFAULT_CONTROL_STYLE,
  chainingSystem: 'HIERARCHICAL',
  ignoreParentSettings: {
    ignoreFilters: false,
    ignoreQuery: false,
    ignoreTimerange: false,
    ignoreValidations: false,
  },
});

export const persistableControlGroupInputIsEqual = (
  a: PersistableControlGroupInput | undefined,
  b: PersistableControlGroupInput | undefined
) => {
  const defaultInput = getDefaultControlGroupInput();
  const inputA = {
    ...defaultInput,
    ...pick(a, ['panels', 'chainingSystem', 'controlStyle', 'ignoreParentSettings']),
  };
  const inputB = {
    ...defaultInput,
    ...pick(b, ['panels', 'chainingSystem', 'controlStyle', 'ignoreParentSettings']),
  };

  if (
    getPanelsAreEqual(inputA.panels, inputB.panels) &&
    deepEqual(omit(inputA, 'panels'), omit(inputB, 'panels'))
  )
    return true;

  return false;
};

const getPanelsAreEqual = (
  originalPanels: PersistableControlGroupInput['panels'],
  newPanels: PersistableControlGroupInput['panels']
) => {
  const originalPanelIds = Object.keys(originalPanels);
  const newPanelIds = Object.keys(newPanels);
  const panelIdDiff = xor(originalPanelIds, newPanelIds);
  if (panelIdDiff.length > 0) {
    return false;
  }

  for (const panelId of newPanelIds) {
    const newPanelType = newPanels[panelId].type;
    const panelIsEqual = ControlPanelDiffSystems[newPanelType]
      ? ControlPanelDiffSystems[newPanelType].getPanelIsEqual(
          originalPanels[panelId],
          newPanels[panelId]
        )
      : genericControlPanelDiffSystem.getPanelIsEqual(originalPanels[panelId], newPanels[panelId]);
    if (!panelIsEqual) return false;
  }
  return true;
};

export const controlGroupInputToRawControlGroupAttributes = (
  controlGroupInput: Omit<ControlGroupInput, 'id'>
): RawControlGroupAttributes => {
  return {
    controlStyle: controlGroupInput.controlStyle,
    chainingSystem: controlGroupInput.chainingSystem,
    panelsJSON: JSON.stringify(controlGroupInput.panels),
    ignoreParentSettingsJSON: JSON.stringify(controlGroupInput.ignoreParentSettings),
  };
};

export const generateNewControlIds = (controlGroupInput?: PersistableControlGroupInput) => {
  if (!controlGroupInput?.panels) return;

  const newPanelsMap: ControlsPanels = {};
  for (const panel of Object.values(controlGroupInput.panels)) {
    const newId = v4();
    newPanelsMap[newId] = {
      ...panel,
      explicitInput: { ...panel.explicitInput, id: newId },
    };
  }
  return { ...controlGroupInput, panels: newPanelsMap };
};

export const rawControlGroupAttributesToControlGroupInput = (
  rawControlGroupAttributes: RawControlGroupAttributes
): PersistableControlGroupInput | undefined => {
  const defaultControlGroupInput = getDefaultControlGroupInput();
  const { chainingSystem, controlStyle, ignoreParentSettingsJSON, panelsJSON } =
    rawControlGroupAttributes;
  const panels = safeJSONParse<ControlGroupInput['panels']>(panelsJSON);
  const ignoreParentSettings =
    safeJSONParse<ControlGroupInput['ignoreParentSettings']>(ignoreParentSettingsJSON);
  return {
    ...defaultControlGroupInput,
    ...(chainingSystem ? { chainingSystem } : {}),
    ...(controlStyle ? { controlStyle } : {}),
    ...(ignoreParentSettings ? { ignoreParentSettings } : {}),
    ...(panels ? { panels } : {}),
  };
};

export const rawControlGroupAttributesToSerializable = (
  rawControlGroupAttributes: Omit<RawControlGroupAttributes, 'id'>
): SerializableRecord => {
  const defaultControlGroupInput = getDefaultControlGroupInput();
  return {
    chainingSystem: rawControlGroupAttributes?.chainingSystem,
    controlStyle: rawControlGroupAttributes?.controlStyle ?? defaultControlGroupInput.controlStyle,
    ignoreParentSettings: safeJSONParse(rawControlGroupAttributes?.ignoreParentSettingsJSON) ?? {},
    panels: safeJSONParse(rawControlGroupAttributes?.panelsJSON) ?? {},
  };
};

export const serializableToRawControlGroupAttributes = (
  serializable: SerializableRecord
): Omit<RawControlGroupAttributes, 'id' | 'type'> => {
  return {
    controlStyle: serializable.controlStyle as RawControlGroupAttributes['controlStyle'],
    chainingSystem: serializable.chainingSystem as RawControlGroupAttributes['chainingSystem'],
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
