/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getOptionDisabledState } from './dimensions_selector_helpers';

describe('dimensions_selector_helpers', () => {
  describe('getOptionDisabledState', () => {
    it('returns false in single-selection mode regardless of other conditions', () => {
      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns false for selected items in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns true when at max limit in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });
  });
});
