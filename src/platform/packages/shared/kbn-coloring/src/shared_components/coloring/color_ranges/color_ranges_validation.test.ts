/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateColorRanges, allRangesValid } from './color_ranges_validation';

describe('Color ranges validation', () => {
  describe('validateColorRanges', () => {
    it('should return correct valid state for color ranges', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '',
        },
        {
          start: 20,
          end: 15,
          color: '#aaa',
        },
      ];
      const validation = validateColorRanges(colorRanges, false);
      expect(validation['0']).toEqual({
        errors: [],
        isValid: true,
      });
      expect(validation['1']).toEqual({
        errors: ['invalidColor'],
        isValid: false,
      });
      expect(validation.last).toEqual({
        errors: ['greaterThanMaxValue'],
        isValid: false,
      });
    });

    it('should check percentage values', () => {
      const colorRanges = [
        {
          start: -30, // Under 0 should be flagged
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 120,
          color: '#aaa',
        },
        {
          start: 120, // Over 100 should be flagged
          end: Infinity, // Infinity should not be flagged
          color: '#aaa',
        },
      ];

      const validation = validateColorRanges(colorRanges, true);

      expect(validation[0]).toEqual({
        errors: ['percentOutOfBounds'],
        isValid: false,
      });

      expect(validation[1]).toEqual({
        errors: [],
        isValid: true,
      });

      expect(validation[2]).toEqual({
        errors: ['percentOutOfBounds'],
        isValid: false,
      });

      expect(validation.last).toEqual({
        errors: [],
        isValid: true,
      });
    });
  });

  describe('isAllColorRangesValid', () => {
    it('should return true if all color ranges is valid', () => {
      const colorRanges = [
        {
          start: 0,
          end: 10,
          color: '#aaa',
        },
        {
          start: 10,
          end: 20,
          color: '#bbb',
        },
        {
          start: 20,
          end: 15,
          color: '#ccc',
        },
      ];
      let isValid = allRangesValid(colorRanges, false);
      expect(isValid).toBeFalsy();
      colorRanges[colorRanges.length - 1].end = 30;
      isValid = allRangesValid(colorRanges, false);
      expect(isValid).toBeTruthy();
    });
  });
});
