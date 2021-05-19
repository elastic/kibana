/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isArray, last } from 'lodash';

export const DEFAULT_VALUE = '-';
export const EMPTY_VALUE = [];
export const DISPLAY_EMPTY_VALUE = DEFAULT_VALUE;

const extractValue = (data) => (data && data[1]) ?? null;

export const getLastValue = (data) => {
  if (!isArray(data)) {
    return data;
  }

  return extractValue(last(data));
};

export const getLastValueOrDefault = (data, defaultValue = DEFAULT_VALUE) => {
  return getLastValue(data) ?? defaultValue;
};

export const getLastValueOrZero = (data) => getLastValueOrDefault(data, 0);

export const getLastValueOrEmpty = (data) => getLastValueOrDefault(data, EMPTY_VALUE);
