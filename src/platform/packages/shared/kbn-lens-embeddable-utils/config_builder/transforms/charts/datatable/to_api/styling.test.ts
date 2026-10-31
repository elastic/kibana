/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LENS_DATATABLE_PAGE_SIZE_OPTIONS } from '@kbn/lens-common';
import { getClosestPageSize } from './styling';

describe('getClosestPageSize', () => {
  it.each(LENS_DATATABLE_PAGE_SIZE_OPTIONS)('keeps the valid page size %s', (size) => {
    expect(getClosestPageSize(size)).toBe(size);
  });

  it.each([
    [21, 20],
    [29, 30],
    [44, 50],
    [60, 50],
    [80, 100],
  ])('maps %s rows per page to the closest size, %s', (size, expected) => {
    expect(getClosestPageSize(size)).toBe(expected);
  });

  it.each([
    [15, 20],
    [25, 30],
    [40, 50],
    [75, 100],
  ])('rounds %s rows per page up to %s when halfway between two sizes', (size, expected) => {
    expect(getClosestPageSize(size)).toBe(expected);
  });

  it('clamps sizes outside the range to the smallest and largest size', () => {
    expect(getClosestPageSize(1)).toBe(10);
    expect(getClosestPageSize(500)).toBe(100);
  });
});
