/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuntimeGridSettings } from '../../types';
import { getRowCountInPixels } from './utils';

const runtimeSettings: RuntimeGridSettings = {
  gutterSize: 0,
  rowHeight: 10,
  columnCount: 48,
  keyboardDragTopLimit: 0,
  columnPixelWidth: 12,
};

describe('getRowCountInPixels', () => {
  describe('with no gutter', () => {
    it('should return Infinity when given infinite rows', () => {
      const result = getRowCountInPixels({
        rowCount: Infinity,
        runtimeSettings,
      });
      expect(result).toBe(Infinity);
    });

    it('should return a number when given a number of rows', () => {
      const result = getRowCountInPixels({
        rowCount: 10,
        runtimeSettings,
      });
      expect(result).toBe(100);
    });
  });

  describe('with a gutter', () => {
    it('should return Infinity when given Infinite rows', () => {
      const result = getRowCountInPixels({
        rowCount: Infinity,
        runtimeSettings: { ...runtimeSettings, gutterSize: 8 },
      });
      expect(result).toBe(Infinity);
    });

    it('should return a number when given a number of rows', () => {
      const result = getRowCountInPixels({
        rowCount: 10,
        runtimeSettings: { ...runtimeSettings, gutterSize: 8 },
      });
      expect(result).toBe(172);
    });
  });
});
