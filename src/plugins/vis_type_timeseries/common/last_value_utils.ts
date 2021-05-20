/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isArray, last, isEqual } from 'lodash';

export const EMPTY_VALUE = [];
export const DISPLAY_EMPTY_VALUE = '-';

type ExtractValueFn<T> = (data: T[] | void) => T | null;
const extractValue: ExtractValueFn<unknown> = (data) => (data && data[1]) ?? null;

type GetLastValueFn<T> = (data: T | T[] | T[][] | void) => T | null;
export const getLastValue: GetLastValueFn<unknown> = (data) => {
  if (!isArray(data)) {
    return data;
  }

  return extractValue(last(data));
};

type GetLastValueOrEmptyFn<T, U> = (data: T[][] | void) => T | U;
export const getLastValueOrEmpty: GetLastValueOrEmptyFn<unknown, []> = (data) =>
  getLastValue(data) ?? EMPTY_VALUE;

type IsEmptyValueFn = (value: unknown) => boolean;
export const isEmptyValue: IsEmptyValueFn = (value) => isEqual(value, EMPTY_VALUE);
