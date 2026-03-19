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
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: true,
          isSelected: true,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns false for selected items in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(false);

      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: true,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });

    it('returns true when not intersecting in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: false,
          isAtMaxLimit: false,
        })
      ).toBe(true);
    });

    it('returns true when at max limit in multi-selection mode', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: true,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });

    it('returns true when both not intersecting and at max limit', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: false,
          isAtMaxLimit: true,
        })
      ).toBe(true);
    });

    it('returns false when intersecting and not at max limit', () => {
      expect(
        getOptionDisabledState({
          singleSelection: false,
          isSelected: false,
          isIntersecting: true,
          isAtMaxLimit: false,
        })
      ).toBe(false);
    });
  });
});
