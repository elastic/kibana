/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosError } from 'axios';
import { createServiceError, removeSlash } from './utils';

describe('Workflows Utils', () => {
  describe('createServiceError', () => {
    it('should create error with Axios error message', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            message: 'API Error: Invalid request',
          },
        },
        message: 'Request failed',
      } as AxiosError;

      const result = createServiceError(axiosError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: API Error: Invalid request');
    });

    it('should use Axios error message when response data has no message', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {},
        },
        message: 'Network error',
      } as AxiosError;

      const result = createServiceError(axiosError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Network error');
    });

    it('should handle Axios error without response data', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Connection timeout',
      } as AxiosError;

      const result = createServiceError(axiosError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Connection timeout');
    });

    it('should handle regular errors', () => {
      const regularError = new Error('Something went wrong');

      const result = createServiceError(regularError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Something went wrong');
    });

    it('should handle errors without message', () => {
      const errorWithoutMessage = {} as Error;

      const result = createServiceError(errorWithoutMessage, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: undefined');
    });
  });

  describe('removeSlash', () => {
    it('should remove trailing slash from URL', () => {
      expect(removeSlash('https://example.com/')).toBe('https://example.com');
    });

    it('should not modify URL without trailing slash', () => {
      expect(removeSlash('https://example.com')).toBe('https://example.com');
    });

    it('should handle empty string', () => {
      expect(removeSlash('')).toBe('');
    });

    it('should handle URL with multiple trailing slashes', () => {
      expect(removeSlash('https://example.com///')).toBe('https://example.com//');
    });

    it('should handle root path with slash', () => {
      expect(removeSlash('/')).toBe('');
    });

    it('should handle path with trailing slash', () => {
      expect(removeSlash('/api/v1/')).toBe('/api/v1');
    });

    it('should handle complex URL with trailing slash', () => {
      expect(removeSlash('https://example.com:8080/api/v1/workflows/')).toBe(
        'https://example.com:8080/api/v1/workflows'
      );
    });
  });
});
