/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { removeSlash, validateAndNormalizeUrl } from './validators';

describe('Workflows Validators', () => {
  describe('validateAndNormalizeUrl', () => {
    let mockConfigurationUtilities: ReturnType<typeof actionsConfigMock.create>;

    beforeEach(() => {
      mockConfigurationUtilities = actionsConfigMock.create();
    });

    it('should return URL when URL is allowed', () => {
      const url = 'https://example.com';

      const result = validateAndNormalizeUrl(mockConfigurationUtilities, url);

      expect(result).toBe(url);
      expect(mockConfigurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(url);
    });

    it('should throw error when URL is not allowed', () => {
      const url = 'https://blocked.com';
      const allowListError = new Error('URL not in allow list');
      mockConfigurationUtilities.ensureUriAllowed.mockImplementation(() => {
        throw allowListError;
      });

      expect(() => validateAndNormalizeUrl(mockConfigurationUtilities, url)).toThrow(
        'Invalid URL https://blocked.com. Error: URL not in allow list'
      );

      expect(mockConfigurationUtilities.ensureUriAllowed).toHaveBeenCalledWith(url);
    });

    it('should handle complex URLs', () => {
      const url = 'https://api.example.com:8080/workflows/v1';

      const result = validateAndNormalizeUrl(mockConfigurationUtilities, url);

      expect(result).toBe(url);
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

    it('should handle single slash', () => {
      expect(removeSlash('/')).toBe('');
    });

    it('should handle path with trailing slash', () => {
      expect(removeSlash('/api/workflows/')).toBe('/api/workflows');
    });

    it('should only remove one trailing slash', () => {
      expect(removeSlash('https://example.com//')).toBe('https://example.com/');
    });
  });
});
