/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isDuration } from './durations';

describe('durations', () => {
  describe('isDuration', () => {
    test('should return true for valid duration formats', () => {
      expect(isDuration('ps,m,2')).toBeTruthy();
      expect(isDuration('h,h,1')).toBeTruthy();
      expect(isDuration('m,d,')).toBeTruthy();
      expect(isDuration('s,Y,4')).toBeTruthy();
      expect(isDuration('ps,humanize,')).toBeTruthy();
    });

    test('should return false for invalid duration formats', () => {
      expect(isDuration('ps,j,2')).toBeFalsy();
      expect(isDuration('i,h,1')).toBeFalsy();
      expect(isDuration('m,d')).toBeFalsy();
      expect(isDuration('s')).toBeFalsy();
      expect(isDuration('humanize,s,2')).toBeFalsy();
    });
  });
});
