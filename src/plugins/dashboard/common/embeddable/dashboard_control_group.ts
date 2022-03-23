/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { ControlGroupInput, getDefaultControlGroupInput } from '../../../controls/common';
import { RawControlGroupAttributes } from '../types';

export const getDefaultDashboardControlGroupInput = getDefaultControlGroupInput;

export const controlGroupInputToRawAttributes = (
  controlGroupInput: Omit<ControlGroupInput, 'id'>
): RawControlGroupAttributes => {
  return {
    controlStyle: controlGroupInput.controlStyle,
    chainingSystem: controlGroupInput.chainingSystem,
    panelsJSON: JSON.stringify(controlGroupInput.panels),
    ignoreParentSettingsJSON: JSON.stringify(controlGroupInput.ignoreParentSettings),
  };
};

const safeJSONParse = <OutType>(jsonString?: string): OutType | undefined => {
  if (!jsonString && typeof jsonString !== 'string') return;
  try {
    return JSON.parse(jsonString) as OutType;
  } catch {
    return;
  }
};

export const rawAttributesToControlGroupInput = (
  rawControlGroupAttributes: RawControlGroupAttributes
): Omit<ControlGroupInput, 'id'> | undefined => {
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

export const rawAttributesToSerializable = (
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

export const serializableToRawAttributes = (
  serializable: SerializableRecord
): Omit<RawControlGroupAttributes, 'id' | 'type'> => {
  return {
    controlStyle: serializable.controlStyle as RawControlGroupAttributes['controlStyle'],
    chainingSystem: serializable.chainingSystem as RawControlGroupAttributes['chainingSystem'],
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
