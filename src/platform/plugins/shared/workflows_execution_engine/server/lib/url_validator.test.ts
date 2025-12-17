/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UrlValidator } from './url_validator';

describe('UrlValidator', () => {
  describe('with wildcard allowedHosts', () => {
    const validator = new UrlValidator({ allowedHosts: ['*'] });

    it('should allow any hostname', () => {
      expect(validator.isHostnameAllowed('example.com')).toBe(true);
      expect(validator.isHostnameAllowed('api.github.com')).toBe(true);
      expect(validator.isHostnameAllowed('malicious.com')).toBe(true);
    });

    it('should allow any URL', () => {
      expect(validator.isUrlAllowed('https://example.com/test')).toBe(true);
      expect(validator.isUrlAllowed('http://api.github.com/users')).toBe(true);
      expect(validator.isUrlAllowed('https://malicious.com/endpoint')).toBe(true);
    });

    it('should not throw for any URL', () => {
      expect(() => validator.ensureUrlAllowed('https://example.com/test')).not.toThrow();
      expect(() => validator.ensureUrlAllowed('http://api.github.com/users')).not.toThrow();
    });
  });

  describe('with specific allowedHosts', () => {
    const validator = new UrlValidator({ allowedHosts: ['example.com', 'api.github.com'] });

    it('should allow only specified hostnames', () => {
      expect(validator.isHostnameAllowed('example.com')).toBe(true);
      expect(validator.isHostnameAllowed('api.github.com')).toBe(true);
      expect(validator.isHostnameAllowed('malicious.com')).toBe(false);
      expect(validator.isHostnameAllowed('github.com')).toBe(false);
    });

    it('should allow only URLs with specified hostnames', () => {
      expect(validator.isUrlAllowed('https://example.com/test')).toBe(true);
      expect(validator.isUrlAllowed('http://api.github.com/users')).toBe(true);
      expect(validator.isUrlAllowed('https://malicious.com/endpoint')).toBe(false);
      expect(validator.isUrlAllowed('https://github.com/users')).toBe(false);
    });

    it('should throw for disallowed URLs', () => {
      expect(() => validator.ensureUrlAllowed('https://malicious.com/test')).toThrow(
        'target url "https://malicious.com/test" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts'
      );
      expect(() => validator.ensureUrlAllowed('https://github.com/users')).toThrow(
        'target url "https://github.com/users" is not added to the Kibana config workflowsExecutionEngine.http.allowedHosts'
      );
    });

    it('should not throw for allowed URLs', () => {
      expect(() => validator.ensureUrlAllowed('https://example.com/test')).not.toThrow();
      expect(() => validator.ensureUrlAllowed('http://api.github.com/users')).not.toThrow();
    });
  });

  describe('with no allowedHosts', () => {
    const validator = new UrlValidator({ allowedHosts: [] });

    it('should deny all hostnames', () => {
      expect(validator.isHostnameAllowed('example.com')).toBe(false);
      expect(validator.isHostnameAllowed('api.github.com')).toBe(false);
    });

    it('should deny all URLs', () => {
      expect(validator.isUrlAllowed('https://example.com/test')).toBe(false);
      expect(validator.isUrlAllowed('http://api.github.com/users')).toBe(false);
    });

    it('should throw for all URLs', () => {
      expect(() => validator.ensureUrlAllowed('https://example.com/test')).toThrow();
      expect(() => validator.ensureUrlAllowed('http://api.github.com/users')).toThrow();
    });
  });

  describe('with invalid URLs', () => {
    const validator = new UrlValidator({ allowedHosts: ['*'] });

    it('should reject malformed URLs', () => {
      expect(validator.isUrlAllowed('not-a-url')).toBe(false);
      expect(validator.isUrlAllowed('')).toBe(false);
    });

    it('should throw for malformed URLs', () => {
      expect(() => validator.ensureUrlAllowed('not-a-url')).toThrow();
      expect(() => validator.ensureUrlAllowed('')).toThrow();
    });
  });

  describe('URL parsing edge cases', () => {
    const validator = new UrlValidator({ allowedHosts: ['example.com'] });

    it('should handle URLs with ports', () => {
      expect(validator.isUrlAllowed('https://example.com:8080/test')).toBe(true);
      expect(validator.isUrlAllowed('http://example.com:3000/api')).toBe(true);
    });

    it('should handle URLs with paths and query parameters', () => {
      expect(validator.isUrlAllowed('https://example.com/api/v1/users?limit=10')).toBe(true);
      expect(validator.isUrlAllowed('https://example.com/path/to/resource#anchor')).toBe(true);
    });

    it('should reject protocol-relative URLs', () => {
      expect(validator.isUrlAllowed('//example.com/test')).toBe(false);
      expect(validator.isUrlAllowed('//malicious.com/test')).toBe(false);
    });
  });
});
