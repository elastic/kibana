/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';

export const CONTROL_TYPES = {
  LIST: 'list' as 'list',
  RANGE: 'range' as 'range',
};
export type CONTROL_TYPES = $Values<typeof CONTROL_TYPES>;

export interface ControlParamsOptions {
  decimalPlaces?: number;
  step?: number;
  type?: string;
  multiselect?: boolean;
  dynamicOptions?: boolean;
  size?: number;
  order?: string;
}

export interface ControlParams {
  id: string;
  type: CONTROL_TYPES;
  label: string;
  fieldName: string;
  indexPattern: string;
  parent: string;
  options: ControlParamsOptions;
}

export const setControl = (
  controls: ControlParams[],
  controlIndex: number,
  control: ControlParams
): ControlParams[] => [
  ...controls.slice(0, controlIndex),
  control,
  ...controls.slice(controlIndex + 1),
];

export const addControl = (controls: ControlParams[], control: ControlParams): ControlParams[] => [
  ...controls,
  control,
];

export const moveControl = (
  controls: ControlParams[],
  controlIndex: number,
  direction: number
): ControlParams[] => {
  let newIndex;
  if (direction >= 0) {
    newIndex = controlIndex + 1;
  } else {
    newIndex = controlIndex - 1;
  }

  if (newIndex < 0) {
    // Move first item to last
    return [...controls.slice(1), controls[0]];
  } else if (newIndex >= controls.length) {
    const lastItemIndex = controls.length - 1;
    // Move last item to first
    return [controls[lastItemIndex], ...controls.slice(0, lastItemIndex)];
  } else {
    const swapped = controls.slice();
    const temp = swapped[newIndex];
    swapped[newIndex] = swapped[controlIndex];
    swapped[controlIndex] = temp;
    return swapped;
  }
};

export const removeControl = (controls: ControlParams[], controlIndex: number): ControlParams[] => [
  ...controls.slice(0, controlIndex),
  ...controls.slice(controlIndex + 1),
];

export const getDefaultOptions = (type: CONTROL_TYPES): ControlParamsOptions => {
  const defaultOptions: ControlParamsOptions = {};
  switch (type) {
    case CONTROL_TYPES.RANGE:
      defaultOptions.decimalPlaces = 0;
      defaultOptions.step = 1;
      break;
    case CONTROL_TYPES.LIST:
      defaultOptions.type = 'terms';
      defaultOptions.multiselect = true;
      defaultOptions.dynamicOptions = true;
      defaultOptions.size = 5;
      defaultOptions.order = 'desc';
      break;
  }
  return defaultOptions;
};

export const newControl = (type: CONTROL_TYPES): ControlParams => ({
  id: new Date().getTime().toString(),
  indexPattern: '',
  fieldName: '',
  parent: '',
  label: '',
  type,
  options: getDefaultOptions(type),
});

export const getTitle = (controlParams: ControlParams, controlIndex: number): string => {
  let title = `${controlParams.type}: ${controlIndex}`;
  if (controlParams.label) {
    title = `${controlParams.label}`;
  } else if (controlParams.fieldName) {
    title = `${controlParams.fieldName}`;
  }
  return title;
};
