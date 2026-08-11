/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('Browser platform', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('macOS detection', () => {
    it('should detect macOS from userAgentData.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: { platform: 'macOS' },
          platform: 'Something Else',
          userAgent: 'Something Else',
        },
        configurable: true,
      });

      const { isMac, getPlatform } = await import('./platform');

      expect(isMac).toBe(true);
      expect(getPlatform()).toBe('mac');
    });

    it('should detect macOS from userAgent', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          platform: 'Something Else',
        },
        configurable: true,
      });

      const { isMac, getPlatform } = await import('./platform');

      expect(isMac).toBe(true);
      expect(getPlatform()).toBe('mac');
    });

    it('should detect macOS from navigator.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'MacIntel',
        },
        configurable: true,
      });

      const { isMac, getPlatform } = await import('./platform');

      expect(isMac).toBe(true);
      expect(getPlatform()).toBe('mac');
    });
  });

  describe('Windows detection', () => {
    it('should detect Windows from userAgentData.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: { platform: 'Windows' },
          platform: 'Something Else',
          userAgent: 'Something Else',
        },
        configurable: true,
      });

      const { isWindows, getPlatform } = await import('./platform');

      expect(isWindows).toBe(true);
      expect(getPlatform()).toBe('windows');
    });

    it('should detect Windows from userAgent', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Something Else',
        },
        configurable: true,
      });
      const { isWindows, getPlatform } = await import('./platform');

      expect(isWindows).toBe(true);
      expect(getPlatform()).toBe('windows');
    });

    it('should detect Windows from navigator.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'Win32',
        },
        configurable: true,
      });

      const { isWindows, getPlatform } = await import('./platform');

      expect(isWindows).toBe(true);
      expect(getPlatform()).toBe('windows');
    });
  });

  describe('Linux detection', () => {
    it('should detect Linux from userAgentData.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: { platform: 'Linux' },
          platform: 'Something Else',
        },
        configurable: true,
      });

      const { isLinux, getPlatform } = await import('./platform');

      expect(isLinux).toBe(true);
      expect(getPlatform()).toBe('linux');
    });

    it('should detect Linux from userAgent', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent:
            'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          platform: 'Something Else',
        },
        configurable: true,
      });

      const { isLinux, getPlatform } = await import('./platform');

      expect(isLinux).toBe(true);
      expect(getPlatform()).toBe('linux');
    });

    it('should detect Linux from navigator.platform', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'Linux x86_64',
        },
        configurable: true,
      });

      const { isLinux, getPlatform } = await import('./platform');

      expect(isLinux).toBe(true);
      expect(getPlatform()).toBe('linux');
    });
  });

  describe('fallback behavior', () => {
    it('should return "other" when no platform matches', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'FreeBSD',
          userAgent: 'FreeBSD',
        },
        configurable: true,
      });

      const { isMac, isWindows, isLinux, getPlatform } = await import('./platform');

      expect(isMac).toBe(false);
      expect(isWindows).toBe(false);
      expect(isLinux).toBe(false);
      expect(getPlatform()).toBe('other');
    });

    it('should handle undefined navigator', async () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        configurable: true,
      });

      const { getPlatform } = await import('./platform');

      expect(getPlatform()).toBe('other');
    });
  });
});
