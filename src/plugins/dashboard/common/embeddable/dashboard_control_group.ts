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
): Omit<RawControlGroupAttributes, 'id'> => {
  return {
    controlStyle: controlGroupInput.controlStyle,
    chainingSytem: controlGroupInput.chainingSytem,
    panelsJSON: JSON.stringify(controlGroupInput.panels),
    ignoreParentSettingsJSON: JSON.stringify(controlGroupInput.ignoreParentSettings),
  };
};

export const rawAttributesToControlGroupInput = (
  rawControlGroupAttributes: Omit<RawControlGroupAttributes, 'id'>
): Omit<ControlGroupInput, 'id'> | undefined => {
  const defaultControlGroupInput = getDefaultControlGroupInput();
  return {
    ...defaultControlGroupInput,
    chainingSytem: rawControlGroupAttributes?.chainingSytem,
    controlStyle: rawControlGroupAttributes?.controlStyle ?? defaultControlGroupInput.controlStyle,
    ignoreParentSettings:
      rawControlGroupAttributes?.ignoreParentSettingsJSON &&
      typeof rawControlGroupAttributes?.ignoreParentSettingsJSON === 'string'
        ? JSON.parse(rawControlGroupAttributes?.ignoreParentSettingsJSON)
        : undefined,
    panels:
      rawControlGroupAttributes?.panelsJSON &&
      typeof rawControlGroupAttributes?.panelsJSON === 'string'
        ? JSON.parse(rawControlGroupAttributes?.panelsJSON)
        : {},
  };
};

export const rawAttributesToSerializable = (
  rawControlGroupAttributes: Omit<RawControlGroupAttributes, 'id'>
): SerializableRecord => {
  const defaultControlGroupInput = getDefaultControlGroupInput();
  return {
    chainingSystem: rawControlGroupAttributes?.chainingSytem,
    controlStyle: rawControlGroupAttributes?.controlStyle ?? defaultControlGroupInput.controlStyle,
    parentIgnoreSettings:
      rawControlGroupAttributes?.ignoreParentSettingsJSON &&
      typeof rawControlGroupAttributes?.ignoreParentSettingsJSON === 'string'
        ? (JSON.parse(rawControlGroupAttributes?.ignoreParentSettingsJSON) as SerializableRecord)
        : {},
    panels:
      rawControlGroupAttributes?.panelsJSON &&
      typeof rawControlGroupAttributes?.panelsJSON === 'string'
        ? (JSON.parse(rawControlGroupAttributes?.panelsJSON) as SerializableRecord)
        : {},
  };
};

export const serializableToRawAttributes = (
  serializable: SerializableRecord
): Omit<RawControlGroupAttributes, 'id'> => {
  return {
    controlStyle: serializable.controlStyle as RawControlGroupAttributes['controlStyle'],
    chainingSytem: serializable.chainingSystem as RawControlGroupAttributes['chainingSytem'],
    ignoreParentSettingsJSON: JSON.stringify(serializable.ignoreParentSettings),
    panelsJSON: JSON.stringify(serializable.panels),
  };
};
