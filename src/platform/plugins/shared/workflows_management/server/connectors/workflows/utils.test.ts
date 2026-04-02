/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createServiceError } from './utils';

describe('Workflows Utils', () => {
  describe('createServiceError', () => {
    it('should create error with response error message', () => {
      const fetchError = Object.assign(new Error('Request failed'), {
        response: {
          data: {
            message: 'API Error: Invalid request',
          },
        },
      });

      const result = createServiceError(fetchError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: API Error: Invalid request');
    });

    it('should use error message when response data has no message', () => {
      const fetchError = Object.assign(new Error('Network error'), {
        response: {
          data: {},
        },
      });

      const result = createServiceError(fetchError, 'Operation failed');

      expect(result.message).toBe('Operation failed. Error: Network error');
    });

    it('should handle error without response data', () => {
      const fetchError = Object.assign(new Error('Connection timeout'), {
        response: undefined,
      });

      const result = createServiceError(fetchError, 'Operation failed');

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
});
