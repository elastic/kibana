/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeComputed } from '@elastic/eui';
import { getCurrentConsoleMaxSize } from './console_resize_button';

describe('Console Resizing Tests', () => {
  describe('getCurrentConsoleMaxSize', () => {
    let getElementByIdSpy: jest.SpyInstance;
    let mockBase: number;
    let mockAppRect: { height: number };
    let mockTheme: EuiThemeComputed<{}>;

    beforeEach(() => {
      mockBase = 16;
      mockAppRect = { height: 1000 };
      mockTheme = { base: mockBase } as unknown as EuiThemeComputed<{}>;
      getElementByIdSpy = jest.spyOn(document, 'getElementById');
      getElementByIdSpy.mockImplementation((id: string) => {
        if (id === 'app-fixed-viewport') {
          return {
            getBoundingClientRect: () => mockAppRect,
          } as any;
        }
        return null;
      });
    });

    afterEach(() => {
      getElementByIdSpy.mockRestore();
    });

    it('computes max size as app height minus base', () => {
      expect(getCurrentConsoleMaxSize(mockTheme)).toBe(984);
    });

    it('returns min height if app-fixed-viewport is missing', () => {
      getElementByIdSpy.mockImplementation(() => null);
      expect(getCurrentConsoleMaxSize(mockTheme)).toBe(200); // CONSOLE_MIN_HEIGHT
    });
  });
});
