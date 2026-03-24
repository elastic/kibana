/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema } from './v1';

describe('HTTP Schema', () => {
  describe('ConfigSchema', () => {
    it('validates with url only', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com',
        })
      ).not.toThrow();
    });

    it('applies default hasAuth to true', () => {
      const result = ConfigSchema.parse({
        url: 'https://api.example.com',
      });
      expect(result.hasAuth).toBe(true);
    });

    it('does not default authType when hasAuth is false', () => {
      const result = ConfigSchema.parse({
        url: 'https://api.example.com',
        hasAuth: false,
      });
      expect(result.authType).toBeNull();
    });
  });
});

