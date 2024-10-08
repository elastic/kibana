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
    let windowSpy: jest.SpyInstance;
    let mockHeaderOffset: string;
    const mockBodyStyle = {
      getPropertyValue: jest.fn().mockImplementation(() => mockHeaderOffset),
    };
    let mockTheme: EuiThemeComputed<{}>;
    beforeEach(() => {
      mockTheme = {
        size: {
          base: '16px',
        },
      } as unknown as EuiThemeComputed<{}>;
      mockHeaderOffset = '48px';
      windowSpy = jest.spyOn(window, 'window', 'get');
      windowSpy.mockImplementation(() => ({
        getComputedStyle: jest.fn().mockReturnValue(mockBodyStyle),
        innerHeight: 1000,
      }));
    });
    afterEach(() => {
      windowSpy.mockRestore();
    });

    it('computes max size with base size offset', () => {
      expect(getCurrentConsoleMaxSize(mockTheme)).toBe(936);
    });
    it('can handle failing to parse base size', () => {
      mockTheme = {
        size: {
          base: undefined,
        },
      } as unknown as EuiThemeComputed<{}>;
      expect(getCurrentConsoleMaxSize(mockTheme)).toBe(936);
    });
    it('can handle failing to parse header offset', () => {
      mockHeaderOffset = 'calc(32px + 48px)';
      expect(getCurrentConsoleMaxSize(mockTheme)).toBe(984);
    });
  });
});
