/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { ControlGroupInput } from '../../../controls/common';
import { ControlStyle } from '../../../controls/common/types';
import { RawControlGroupAttributes } from '../types';

export const controlGroupInputToRawAttributes = (
  controlGroupInput: Omit<ControlGroupInput, 'id'>
): Omit<RawControlGroupAttributes, 'id'> => {
  return {
    controlStyle: controlGroupInput.controlStyle,
    panelsJSON: JSON.stringify(controlGroupInput.panels),
  };
};

export const getDefaultDashboardControlGroupInput = () => ({
  controlStyle: 'oneLine' as ControlGroupInput['controlStyle'],
  panels: {},
});

export const rawAttributesToControlGroupInput = (
  rawControlGroupAttributes: Omit<RawControlGroupAttributes, 'id'>
): Omit<ControlGroupInput, 'id'> | undefined => {
  const defaultControlGroupInput = getDefaultDashboardControlGroupInput();
  return {
    controlStyle: rawControlGroupAttributes?.controlStyle ?? defaultControlGroupInput.controlStyle,
    panels:
      rawControlGroupAttributes?.panelsJSON &&
      typeof rawControlGroupAttributes?.panelsJSON === 'string'
        ? JSON.parse(rawControlGroupAttributes?.panelsJSON)
        : defaultControlGroupInput.panels,
  };
};

export const rawAttributesToSerializable = (
  rawControlGroupAttributes: Omit<RawControlGroupAttributes, 'id'>
): SerializableRecord => {
  const defaultControlGroupInput = getDefaultDashboardControlGroupInput();
  return {
    controlStyle: rawControlGroupAttributes?.controlStyle ?? defaultControlGroupInput.controlStyle,
    panels:
      rawControlGroupAttributes?.panelsJSON &&
      typeof rawControlGroupAttributes?.panelsJSON === 'string'
        ? (JSON.parse(rawControlGroupAttributes?.panelsJSON) as SerializableRecord)
        : defaultControlGroupInput.panels,
  };
};

export const serializableToRawAttributes = (
  controlGroupInput: SerializableRecord
): Omit<RawControlGroupAttributes, 'id'> => {
  return {
    controlStyle: controlGroupInput.controlStyle as ControlStyle,
    panelsJSON: JSON.stringify(controlGroupInput.panels),
  };
};
