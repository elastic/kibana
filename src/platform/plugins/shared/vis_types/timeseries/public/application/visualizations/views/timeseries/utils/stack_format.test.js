/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getStackAccessors } from './stack_format';
import { X_ACCESSOR_INDEX, STACKED_OPTIONS } from '../../../constants';

describe('src/legacy/core_plugins/metrics/public/visualizations/views/timeseries/utils/stack_format.js', () => {
  describe('getStackAccessors()', () => {
    test('should return an accessor if the stack is stacked', () => {
      expect(getStackAccessors(STACKED_OPTIONS.STACKED)).toEqual([X_ACCESSOR_INDEX]);
    });

    test('should return an accessor if the stack is percent', () => {
      expect(getStackAccessors(STACKED_OPTIONS.PERCENT)).toEqual([X_ACCESSOR_INDEX]);
    });

    test('should return undefined if the stack does not match with STACKED and PERCENT', () => {
      expect(getStackAccessors(STACKED_OPTIONS.NONE)).toBeUndefined();
    });
  });
});
