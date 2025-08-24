/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isKeyboardShortcut, isMac } from './keyboard_shortcut';

describe('keyboard_shortcut', () => {
  describe('isKeyboardShortcut', () => {
    it('should return true when meta key and single quote are pressed', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'Quote',
        key: "'",
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(true);
    });

    it('should return true when ctrl key and single quote are pressed', () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
        code: 'Quote',
        key: "'",
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(true);
    });

    it('should return true when both meta and ctrl keys are pressed with single quote', () => {
      const event = {
        metaKey: true,
        ctrlKey: true,
        code: 'Quote',
        key: "'",
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(true);
    });

    it('should return false when only single quote is pressed', () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        code: 'Quote',
        key: "'",
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(false);
    });

    it('should return false when meta key is pressed without single quote', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'KeyA',
        key: 'a',
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(false);
    });

    it('should return true when using key property instead of code', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'Unknown',
        key: "'",
      } as KeyboardEvent;

      const result = isKeyboardShortcut(event);

      expect(result).toBe(true);
    });
  });

  describe('isMac', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      global.navigator = originalNavigator;
    });

    it('should return true when platform is macOS using userAgentData', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: {
            platform: 'macOS',
          },
          userAgent: 'Something Else',
        },
        writable: true,
      });

      const isUserAgentMac = isMac();

      expect(isUserAgentMac).toBe(true);
    });

    it('should return true when platform is macOS using userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: undefined,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        writable: true,
      });

      const isUserAgentMac = isMac();

      expect(isUserAgentMac).toBe(true);
    });

    it('should return false when platform is not macOS', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: {
            platform: 'Windows',
          },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        writable: true,
      });

      const isUserAgentMac = isMac();

      expect(isUserAgentMac).toBe(false);
    });
  });
});
