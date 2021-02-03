/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { formatListAsProse } from './prose';

describe('utils formatListAsProse()', () => {
  describe('defaults', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse(['1', '2'])).toEqual('1 and 2');
      expect(formatListAsProse(['1', '2', '3'])).toEqual('1, 2, and 3');
      expect(formatListAsProse(['4', '3', '2', '1'])).toEqual('4, 3, 2, and 1');
    });
  });

  describe('inclusive=true', () => {
    it('joins items together with "and" and commas', () => {
      expect(formatListAsProse(['1', '2'], { inclusive: true })).toEqual('1 and 2');
      expect(formatListAsProse(['1', '2', '3'], { inclusive: true })).toEqual('1, 2, and 3');
      expect(formatListAsProse(['4', '3', '2', '1'], { inclusive: true })).toEqual(
        '4, 3, 2, and 1'
      );
    });
  });

  describe('inclusive=false', () => {
    it('joins items together with "or" and commas', () => {
      expect(formatListAsProse(['1', '2'], { inclusive: false })).toEqual('1 or 2');
      expect(formatListAsProse(['1', '2', '3'], { inclusive: false })).toEqual('1, 2, or 3');
      expect(formatListAsProse(['4', '3', '2', '1'], { inclusive: false })).toEqual(
        '4, 3, 2, or 1'
      );
    });
  });
});
