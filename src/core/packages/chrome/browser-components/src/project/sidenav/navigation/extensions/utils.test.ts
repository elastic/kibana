/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extensionSlotHasData } from './utils';

describe('extension utils', () => {
  describe('extensionSlotHasData', () => {
    it('returns false for null, undefined, and empty arrays', () => {
      expect(extensionSlotHasData(null)).toBe(false);
      expect(extensionSlotHasData(undefined)).toBe(false);
      expect(extensionSlotHasData([])).toBe(false);
    });

    it('returns true for non-empty arrays and other values', () => {
      expect(extensionSlotHasData([{ id: '1' }])).toBe(true);
      expect(extensionSlotHasData({ id: '1' })).toBe(true);
      expect(extensionSlotHasData('value')).toBe(true);
    });
  });
});
