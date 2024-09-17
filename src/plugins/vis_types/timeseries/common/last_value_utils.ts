/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isArray, last, isEqual } from 'lodash';
import type { PanelDataArray } from './types/vis_data';

export const EMPTY_VALUE = null;
export const DISPLAY_EMPTY_VALUE = '-';

const extractValue = (data: PanelDataArray) => (data && data[1]) ?? EMPTY_VALUE;

export const getLastValue = (data: PanelDataArray[] | string | number) => {
  if (!isArray(data)) {
    return data;
  }

  return extractValue(last(data)!);
};

export const isEmptyValue = (value: unknown) => isEqual(value, EMPTY_VALUE);
