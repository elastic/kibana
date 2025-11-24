/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  validateAndSanitizeUrl,
  formatScreenshotFilename,
  validateTextInput,
  validateConfigPath,
  ResponseBuilder,
  success,
  error,
} from '../utils';
import path from 'path';
import fs from 'fs';

describe('Security Validators', () => {
  describe('validateAndSanitizeUrl', () => {
    const baseUrl = 'http://localhost:5601';

    it('should allow valid URLs within the same origin', () => {
      expect(validateAndSanitizeUrl('http://localhost:5601/app/discover', baseUrl)).toBe(
        'http://localhost:5601/app/discover'
      );
      expect(validateAndSanitizeUrl('/app/discover', baseUrl)).toBe(
        'http://localhost:5601/app/discover'
      );
    });

    it('should reject URLs with different origins (SSRF protection)', () => {
      expect(() => validateAndSanitizeUrl('http://evil.com', baseUrl)).toThrow(
        'Invalid URL: must be within target Kibana instance'
      );
      expect(() => validateAndSanitizeUrl('http://localhost:9200', baseUrl)).toThrow(
        'Invalid URL: must be within target Kibana instance'
      );
    });

    it('should reject non-http/https protocols', () => {
      expect(() => validateAndSanitizeUrl('file:///etc/passwd', baseUrl)).toThrow(
        'Invalid protocol: only http and https allowed'
      );
      // eslint-disable-next-line no-script-url
      expect(() => validateAndSanitizeUrl('javascript:alert(1)', baseUrl)).toThrow(
        'Invalid protocol: only http and https allowed'
      );
      expect(() => validateAndSanitizeUrl('ftp://localhost:5601', baseUrl)).toThrow(
        'Invalid protocol: only http and https allowed'
      );
    });

    it('should reject URLs exceeding maximum length', () => {
      const longUrl = 'http://localhost:5601/' + 'a'.repeat(2048);
      expect(() => validateAndSanitizeUrl(longUrl, baseUrl)).toThrow('URL exceeds maximum length');
    });

    it('should handle relative URLs correctly', () => {
      expect(validateAndSanitizeUrl('/api/status', baseUrl)).toBe(
        'http://localhost:5601/api/status'
      );
    });

    it('should reject URLs with suspicious patterns', () => {
      // Try to bypass origin check with @
      expect(() => validateAndSanitizeUrl('http://localhost:5601@evil.com', baseUrl)).toThrow();
    });
  });

  describe('formatScreenshotFilename', () => {
    const screenshotsDir = path.resolve(process.cwd(), 'screenshots');

    afterEach(() => {
      // Cleanup test screenshots directory if it exists
      if (fs.existsSync(screenshotsDir)) {
        const files = fs.readdirSync(screenshotsDir);
        files.forEach((file) => {
          fs.unlinkSync(path.join(screenshotsDir, file));
        });
        if (files.length === 0) {
          fs.rmdirSync(screenshotsDir);
        }
      }
    });

    it('should generate a safe default filename when none provided', () => {
      const filename = formatScreenshotFilename();
      expect(filename).toContain('scout-screenshot-');
      expect(filename).toMatch(/\.png$/);
      expect(filename).toContain(screenshotsDir);
    });

    it('should sanitize and validate provided filenames', () => {
      const filename = formatScreenshotFilename('test.png');
      expect(filename).toBe(path.resolve(screenshotsDir, 'test.png'));
    });

    it('should safely handle path traversal attempts by using basename', () => {
      // path.basename() strips directory components, so '../../../etc/passwd' becomes 'passwd'
      const result1 = formatScreenshotFilename('../../../etc/passwd');
      expect(result1).toContain('screenshots');
      expect(result1).toContain('passwd');
      expect(result1).not.toContain('..');

      const result2 = formatScreenshotFilename('../../secrets.txt');
      expect(result2).toContain('screenshots');
      expect(result2).toContain('secrets.txt');
      expect(result2).not.toContain('..');
    });

    it('should reject filenames with invalid characters', () => {
      expect(() => formatScreenshotFilename('test<script>.png')).toThrow(
        'Filename contains invalid characters'
      );
      expect(() => formatScreenshotFilename('test|pipe.png')).toThrow(
        'Filename contains invalid characters'
      );
      expect(() => formatScreenshotFilename('test&command.png')).toThrow(
        'Filename contains invalid characters'
      );
    });

    it('should reject filenames exceeding maximum length', () => {
      const longFilename = 'a'.repeat(256) + '.png';
      expect(() => formatScreenshotFilename(longFilename)).toThrow(
        'Filename exceeds maximum length'
      );
    });

    it('should allow safe filenames with alphanumeric, dots, dashes, underscores', () => {
      expect(() => formatScreenshotFilename('my-test_screenshot.123.png')).not.toThrow();
      expect(() => formatScreenshotFilename('dashboard-2024-01-15.png')).not.toThrow();
    });

    it('should create screenshots directory if it does not exist', () => {
      if (fs.existsSync(screenshotsDir)) {
        fs.rmdirSync(screenshotsDir, { recursive: true });
      }
      formatScreenshotFilename('test.png');
      expect(fs.existsSync(screenshotsDir)).toBe(true);
    });
  });

  describe('validateTextInput', () => {
    it('should allow text within maximum length', () => {
      expect(() => validateTextInput('Hello World')).not.toThrow();
      expect(() => validateTextInput('a'.repeat(1000))).not.toThrow();
      expect(() => validateTextInput('a'.repeat(10000))).not.toThrow();
    });

    it('should reject text exceeding maximum length', () => {
      const longText = 'a'.repeat(10001);
      expect(() => validateTextInput(longText)).toThrow('Text input exceeds maximum length');
    });

    it('should allow custom maximum length', () => {
      expect(() => validateTextInput('Hello', 10)).not.toThrow();
      expect(() => validateTextInput('Hello World', 10)).toThrow(
        'Text input exceeds maximum length'
      );
    });

    it('should handle empty strings', () => {
      expect(() => validateTextInput('')).not.toThrow();
    });

    it('should handle special characters', () => {
      expect(() => validateTextInput('Test\nwith\nnewlines')).not.toThrow();
      expect(() => validateTextInput('Test with 日本語')).not.toThrow();
      expect(() => validateTextInput('Test with émojis 🎉')).not.toThrow();
    });
  });

  describe('validateConfigPath', () => {
    it('should accept valid config paths with .json extension', () => {
      const validPath = path.resolve(process.cwd(), 'config.json');
      expect(validateConfigPath(validPath)).toBe(validPath);
    });

    it('should accept valid config paths with .jsonc extension', () => {
      const validPath = path.resolve(process.cwd(), 'config.jsonc');
      expect(validateConfigPath(validPath)).toBe(validPath);
    });

    it('should reject paths without .json/.jsonc extension', () => {
      expect(() => validateConfigPath('./config.txt')).toThrow(
        'Config file must have .json or .jsonc extension'
      );
      expect(() => validateConfigPath('./config.yaml')).toThrow(
        'Config file must have .json or .jsonc extension'
      );
    });

    it('should reject paths outside current working directory', () => {
      expect(() => validateConfigPath('/etc/passwd.json')).toThrow(
        'Config path must be within current working directory'
      );
    });

    it('should reject paths with traversal attempts', () => {
      // This might pass if it's still within a parent that's under cwd
      // But deep traversals should fail
      expect(() => validateConfigPath('../../../etc/config.json')).toThrow();
    });

    it('should reject excessively long paths', () => {
      const longPath = './' + 'a'.repeat(600) + '.json';
      expect(() => validateConfigPath(longPath)).toThrow('Config path exceeds maximum length');
    });
  });
});

describe('Response Utilities', () => {
  describe('success', () => {
    it('should create a success result', () => {
      const result = success({ foo: 'bar' }, 'Operation succeeded');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: 'bar' });
      expect(result.message).toBe('Operation succeeded');
      expect(result.error).toBeUndefined();
    });

    it('should create a success result without data', () => {
      const result = success();
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('error', () => {
    it('should create an error result', () => {
      const result = error('Something went wrong', { details: 'More info' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
      expect(result.data).toEqual({ details: 'More info' });
      expect(result.message).toBeUndefined();
    });

    it('should create an error result without data', () => {
      const result = error('Failed');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed');
      expect(result.data).toBeUndefined();
    });
  });
});

describe('ResponseBuilder', () => {
  let builder: ResponseBuilder;

  beforeEach(() => {
    builder = new ResponseBuilder();
  });

  describe('basic response building', () => {
    it('should build a success response with result', () => {
      builder.setResult('Operation completed');
      const response = builder.build();
      expect(response).toContain('### Result');
      expect(response).toContain('Operation completed');
    });

    it('should build an error response', () => {
      builder.setError('Operation failed');
      const response = builder.build();
      expect(response).toContain('### Error');
      expect(response).toContain('Operation failed');
    });

    it('should include executed code in response', () => {
      builder.setResult('Success');
      builder.addCode('await page.click(".button")', 'typescript');
      const response = builder.build();
      expect(response).toContain('### Executed code');
      expect(response).toContain('```typescript');
      expect(response).toContain('await page.click(".button")');
    });
  });

  describe('page state', () => {
    it('should include page state information', () => {
      builder.setPageState('http://localhost:5601/app/discover', 'Discover - Kibana');
      const response = builder.build();
      expect(response).toContain('### Page state');
      expect(response).toContain('http://localhost:5601/app/discover');
      expect(response).toContain('Discover - Kibana');
    });

    it('should include page snapshot if provided', () => {
      builder.setPageState('http://test.com', 'Test', 'button "Click me"');
      const response = builder.build();
      expect(response).toContain('### Page state');
      expect(response).toContain('```yaml');
      expect(response).toContain('button "Click me"');
    });
  });

  describe('Kibana state', () => {
    it('should include Kibana application state', () => {
      builder.setKibanaState('discover', '/view/123');
      const response = builder.build();
      expect(response).toContain('### Kibana app state');
      expect(response).toContain('discover');
      expect(response).toContain('/view/123');
    });

    it('should include Kibana context', () => {
      builder.setKibanaState('dashboard', undefined, { dashboardId: 'abc123' });
      const response = builder.build();
      expect(response).toContain('### Kibana app state');
      expect(response).toContain('```json');
      expect(response).toContain('dashboardId');
    });
  });

  describe('custom sections', () => {
    it('should include custom sections', () => {
      builder.addSection('Debug Info', 'Detailed debugging information');
      const response = builder.build();
      expect(response).toContain('### Debug Info');
      expect(response).toContain('Detailed debugging information');
    });

    it('should support multiple custom sections', () => {
      builder.addSection('Section 1', 'Content 1');
      builder.addSection('Section 2', 'Content 2');
      const response = builder.build();
      expect(response).toContain('### Section 1');
      expect(response).toContain('Content 1');
      expect(response).toContain('### Section 2');
      expect(response).toContain('Content 2');
    });
  });

  describe('buildAsToolResult', () => {
    it('should build a ToolResult object with success', () => {
      builder.setResult('Operation succeeded');
      const result = builder.buildAsToolResult();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation succeeded');
      expect(result.data).toContain('### Result');
    });

    it('should build a ToolResult object with error', () => {
      builder.setError('Operation failed');
      const result = builder.buildAsToolResult();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Operation failed');
      expect(result.data).toContain('### Error');
    });
  });

  describe('method chaining', () => {
    it('should support method chaining', () => {
      const response = builder
        .setResult('Success')
        .addCode('test code')
        .setPageState('http://test.com', 'Test')
        .addSection('Custom', 'Data')
        .build();

      expect(response).toContain('Success');
      expect(response).toContain('test code');
      expect(response).toContain('http://test.com');
      expect(response).toContain('Custom');
    });
  });
});
