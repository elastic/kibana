/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  scoutNavigate,
  scoutClick,
  scoutType,
  scoutSnapshot,
  scoutScreenshot,
  scoutWaitFor,
  scoutGetUrl,
  scoutGetTitle,
  scoutReload,
} from '../browser';
import type { ScoutSession } from '../../session';
import type { ScoutPage } from '@kbn/scout';

describe('Browser Tools', () => {
  let mockSession: jest.Mocked<ScoutSession>;
  let mockPage: jest.Mocked<ScoutPage>;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(null),
      click: jest.fn().mockResolvedValue(null),
      fill: jest.fn().mockResolvedValue(null),
      clear: jest.fn().mockResolvedValue(null),
      press: jest.fn().mockResolvedValue(null),
      pressSequentially: jest.fn().mockResolvedValue(null),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
      title: jest.fn().mockResolvedValue('Test Page'),
      url: jest.fn().mockReturnValue('http://localhost:5601/app/discover'),
      goBack: jest.fn().mockResolvedValue(null),
      goForward: jest.fn().mockResolvedValue(null),
      reload: jest.fn().mockResolvedValue(null),
      waitForTimeout: jest.fn().mockResolvedValue(null),
      locator: jest.fn().mockReturnValue({
        click: jest.fn().mockResolvedValue(null),
        clear: jest.fn().mockResolvedValue(null),
        fill: jest.fn().mockResolvedValue(null),
        press: jest.fn().mockResolvedValue(null),
        pressSequentially: jest.fn().mockResolvedValue(null),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
        waitFor: jest.fn().mockResolvedValue(null),
        ariaSnapshot: jest.fn().mockResolvedValue('button "Click me"'),
      }),
      getByText: jest.fn().mockReturnValue({
        waitFor: jest.fn().mockResolvedValue(null),
      }),
      accessibility: {
        snapshot: jest.fn().mockResolvedValue({ role: 'main', name: 'Test' }),
      },
      // ScoutPage extensions
      testSubj: {
        click: jest.fn().mockResolvedValue(null),
        fill: jest.fn().mockResolvedValue(null),
        locator: jest.fn().mockReturnValue({
          click: jest.fn().mockResolvedValue(null),
          fill: jest.fn().mockResolvedValue(null),
          press: jest.fn().mockResolvedValue(null),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-screenshot')),
        }),
        waitForSelector: jest.fn().mockResolvedValue(null),
        typeWithDelay: jest.fn().mockResolvedValue(null),
        clearInput: jest.fn().mockResolvedValue(null),
      },
      gotoApp: jest.fn().mockResolvedValue(null),
      waitForLoadingIndicatorHidden: jest.fn().mockResolvedValue(null),
      keyTo: jest.fn().mockResolvedValue(null),
    } as any;

    mockSession = {
      isInitialized: jest.fn().mockReturnValue(true),
      getPage: jest.fn().mockResolvedValue(mockPage),
      getTargetUrl: jest.fn().mockReturnValue('http://localhost:5601'),
      getAriaSnapshot: jest.fn().mockResolvedValue('button "Click me"'),
      getSnapshot: jest.fn().mockResolvedValue('{"role": "main"}'),
    } as any;
  });

  describe('scoutNavigate', () => {
    it('should navigate to a URL', async () => {
      const result = await scoutNavigate(mockSession, {
        url: 'http://localhost:5601/app/discover',
      });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:5601/app/discover');
      expect(result.data).toContain('Successfully navigated');
    });

    it('should navigate to an app', async () => {
      const result = await scoutNavigate(mockSession, {
        app: 'discover',
      });

      expect(result.success).toBe(true);
      expect(mockPage.gotoApp).toHaveBeenCalledWith('discover');
    });

    it('should navigate to an app with path', async () => {
      const result = await scoutNavigate(mockSession, {
        app: 'discover',
        path: '/view/123',
      });

      expect(result.success).toBe(true);
      expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:5601/app/discover/view/123');
    });

    it('should reject invalid app names', async () => {
      const result = await scoutNavigate(mockSession, {
        app: 'app/../../../etc/passwd',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid app name');
    });

    it('should reject path traversal in path parameter', async () => {
      const result = await scoutNavigate(mockSession, {
        app: 'discover',
        path: '/../../../etc/passwd',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('path traversal');
    });

    it('should return error if not initialized', async () => {
      mockSession.isInitialized.mockReturnValue(false);
      const result = await scoutNavigate(mockSession, { url: 'http://localhost:5601' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('should require either url or app parameter', async () => {
      const result = await scoutNavigate(mockSession, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Either url or app parameter must be provided');
    });
  });

  describe('scoutClick', () => {
    it('should click element by test subject', async () => {
      const result = await scoutClick(mockSession, { testSubj: 'myButton' });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.click).toHaveBeenCalledWith('myButton');
    });

    it('should click element by selector', async () => {
      const result = await scoutClick(mockSession, { selector: '.my-button' });

      expect(result.success).toBe(true);
      expect(mockPage.locator).toHaveBeenCalledWith('.my-button');
    });

    it('should require testSubj or selector', async () => {
      const result = await scoutClick(mockSession, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Either testSubj or selector parameter must be provided');
    });

    it('should handle click failures with helpful message', async () => {
      (mockPage.testSubj.click as jest.Mock).mockRejectedValue(
        new Error('Timeout 30000ms exceeded')
      );

      const result = await scoutClick(mockSession, { testSubj: 'missing' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.data).toContain('snapshot tool');
    });
  });

  describe('scoutType', () => {
    it('should type text into element', async () => {
      const result = await scoutType(mockSession, {
        testSubj: 'searchInput',
        text: 'test query',
      });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.fill).toHaveBeenCalledWith('searchInput', 'test query');
    });

    it('should type text slowly if requested', async () => {
      const result = await scoutType(mockSession, {
        testSubj: 'searchInput',
        text: 'test query',
        slowly: true,
      });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.typeWithDelay).toHaveBeenCalledWith('searchInput', 'test query', {
        delay: 100,
      });
    });

    it('should submit after typing if requested', async () => {
      const result = await scoutType(mockSession, {
        testSubj: 'searchInput',
        text: 'test query',
        submit: true,
      });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.fill).toHaveBeenCalledWith('searchInput', 'test query');
      expect(mockPage.testSubj.locator).toHaveBeenCalledWith('searchInput');
    });

    it('should require text parameter', async () => {
      // Empty string is technically provided, let's test without text field
      const result = await scoutType(mockSession, {
        testSubj: 'searchInput',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('text parameter is required');
    });

    it('should validate text length', async () => {
      const longText = 'a'.repeat(10001);
      const result = await scoutType(mockSession, {
        testSubj: 'input',
        text: longText,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum length');
    });
  });

  describe('scoutSnapshot', () => {
    it('should get ARIA snapshot by default', async () => {
      const result = await scoutSnapshot(mockSession, {});

      expect(result.success).toBe(true);
      expect(mockSession.getAriaSnapshot).toHaveBeenCalled();
      expect(result.data).toContain('button "Click me"');
    });

    it('should get JSON snapshot if requested', async () => {
      const result = await scoutSnapshot(mockSession, { format: 'json' });

      expect(result.success).toBe(true);
      expect(mockSession.getSnapshot).toHaveBeenCalled();
      expect(result.data).toContain('role');
    });

    it('should include page context', async () => {
      const result = await scoutSnapshot(mockSession, {});

      expect(result.success).toBe(true);
      expect(mockPage.title).toHaveBeenCalled();
      expect(mockPage.url).toHaveBeenCalled();
    });
  });

  describe('scoutScreenshot', () => {
    it('should take full page screenshot', async () => {
      const result = await scoutScreenshot(mockSession, {
        filename: 'test.png',
        fullPage: true,
      });

      expect(result.success).toBe(true);
      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          fullPage: true,
        })
      );
    });

    it('should take element screenshot by test subject', async () => {
      const result = await scoutScreenshot(mockSession, {
        testSubj: 'dashboard',
        filename: 'element.png',
      });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.locator).toHaveBeenCalledWith('dashboard');
    });

    it('should generate filename if not provided', async () => {
      const result = await scoutScreenshot(mockSession, {});

      expect(result.success).toBe(true);
      expect(result.data).toContain('scout-screenshot-');
    });
  });

  describe('scoutWaitFor', () => {
    it('should wait for time', async () => {
      const result = await scoutWaitFor(mockSession, { time: 2 });

      expect(result.success).toBe(true);
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
    });

    it('should wait for text', async () => {
      const result = await scoutWaitFor(mockSession, { text: 'Loading complete' });

      expect(result.success).toBe(true);
      expect(mockPage.getByText).toHaveBeenCalledWith('Loading complete');
    });

    it('should wait for element by test subject', async () => {
      const result = await scoutWaitFor(mockSession, {
        testSubj: 'dataLoaded',
        state: 'visible',
      });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.waitForSelector).toHaveBeenCalledWith('dataLoaded', {
        state: 'visible',
      });
    });

    it('should default to visible state', async () => {
      const result = await scoutWaitFor(mockSession, { testSubj: 'element' });

      expect(result.success).toBe(true);
      expect(mockPage.testSubj.waitForSelector).toHaveBeenCalledWith('element', {
        state: 'visible',
      });
    });

    it('should require a wait condition', async () => {
      const result = await scoutWaitFor(mockSession, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid wait condition');
    });
  });

  describe('scoutGetUrl', () => {
    it('should get current URL', async () => {
      const result = await scoutGetUrl(mockSession);

      expect(result.success).toBe(true);
      expect(mockPage.url).toHaveBeenCalled();
      expect(result.data).toContain('http://localhost:5601/app/discover');
    });
  });

  describe('scoutGetTitle', () => {
    it('should get page title', async () => {
      const result = await scoutGetTitle(mockSession);

      expect(result.success).toBe(true);
      expect(mockPage.title).toHaveBeenCalled();
      expect(result.data).toContain('Test Page');
    });
  });

  describe('scoutReload', () => {
    it('should reload the page', async () => {
      const result = await scoutReload(mockSession);

      expect(result.success).toBe(true);
      expect(mockPage.reload).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle page not available errors', async () => {
      mockSession.getPage.mockRejectedValue(new Error('Browser not initialized'));
      const result = await scoutClick(mockSession, { testSubj: 'button' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide helpful suggestions for timeout errors', async () => {
      (mockPage.testSubj.click as jest.Mock).mockRejectedValue(new Error('Timeout exceeded'));

      const result = await scoutClick(mockSession, { testSubj: 'button' });

      expect(result.success).toBe(false);
      expect(result.data).toContain('Suggestion');
      expect(result.data).toContain('snapshot tool');
    });
  });
});
