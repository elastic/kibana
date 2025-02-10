/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRangeValid } from './is_range_valid';

it('Should return true when lower and upper values are set and between min and max', () => {
  const { isValid } = isRangeValid([2, 3], 1, 10);
  expect(isValid).toBe(true);
});

it('Should handle string values and return true when lower and upper values are set and between min and max', () => {
  const { isValid } = isRangeValid(['192', '1000'], 100, 1000);
  expect(isValid).toBe(true);
});

it('Should return true when lower and upper values are not set (empty range)', () => {
  const { isValid } = isRangeValid(['', ''], 1, 10);
  expect(isValid).toBe(true);
});

it('Should return false when lower and upper values are not set (empty range) and empty ranges are not allowed', () => {
  const { isValid } = isRangeValid(['', ''], 1, 10, false);
  expect(isValid).toBe(false);
});

it('Should return false when lower value is not set and upper value is set', () => {
  const { isValid, errorMessage } = isRangeValid(['', 3], 1, 10);
  expect(isValid).toBe(false);
  expect(errorMessage).toBe('Both lower and upper values must be set');
});

it('Should return false when lower value is set and upper value is not set', () => {
  const { isValid, errorMessage } = isRangeValid([2, ''], 1, 10);
  expect(isValid).toBe(false);
  expect(errorMessage).toBe('Both lower and upper values must be set');
});

it('Should return false when lower value is greater than upper value', () => {
  const { isValid, errorMessage } = isRangeValid([3, 2], 1, 10);
  expect(isValid).toBe(false);
  expect(errorMessage).toBe('Upper value must be greater or equal to lower value');
});

it('Should return false when lower value is less than min', () => {
  const { isValid, errorMessage } = isRangeValid([0, 2], 1, 10);
  expect(isValid).toBe(false);
  expect(errorMessage).toBe('Values must be on or between 1 and 10');
});

it('Should return false when upper value is greater than max', () => {
  const { isValid, errorMessage } = isRangeValid([2, 12], 1, 10);
  expect(isValid).toBe(false);
  expect(errorMessage).toBe('Values must be on or between 1 and 10');
});
