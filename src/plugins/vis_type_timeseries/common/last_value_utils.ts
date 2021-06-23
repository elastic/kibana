/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isArray, last, isEqual } from 'lodash';

export const EMPTY_VALUE = null;
export const DISPLAY_EMPTY_VALUE = '-';

const extractValue = (data: unknown[] | void) => (data && data[1]) ?? EMPTY_VALUE;

export const getLastValue = (data: unknown) => {
  if (!isArray(data)) {
    return data;
  }

  return extractValue(last(data));
};

export const isEmptyValue = (value: unknown) => isEqual(value, EMPTY_VALUE);
