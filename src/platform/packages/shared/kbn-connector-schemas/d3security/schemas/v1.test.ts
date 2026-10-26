/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  D3SecurityConfigSchema,
  D3SecuritySecretsSchema,
  D3SecurityRunActionParamsSchema,
  D3SecurityRunActionResponseSchema,
} from './v1';

describe('D3Security Schema', () => {
  describe('D3SecurityConfigSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        D3SecurityConfigSchema.parse({
          url: 'https://api.d3security.com',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => D3SecurityConfigSchema.parse({})).toThrow();
    });

    it('accepts empty string for url', () => {
      expect(() =>
        D3SecurityConfigSchema.parse({
          url: '',
        })
      ).not.toThrow();
    });
  });

  describe('D3SecuritySecretsSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        D3SecuritySecretsSchema.parse({
          token: 'secret-token-123',
        })
      ).not.toThrow();
    });

    it('throws when token is missing', () => {
      expect(() => D3SecuritySecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        D3SecuritySecretsSchema.parse({
          token: 'secret-token-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('D3SecurityRunActionParamsSchema', () => {
    it('validates with empty object', () => {
      expect(() => D3SecurityRunActionParamsSchema.parse({})).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        D3SecurityRunActionParamsSchema.parse({
          body: '{"event": "test"}',
          severity: 'high',
          eventType: 'security_alert',
        })
      ).not.toThrow();
    });

    it('validates empty object with optional fields', () => {
      expect(() => D3SecurityRunActionParamsSchema.parse({})).not.toThrow();
    });

    it('validates with only body', () => {
      expect(() =>
        D3SecurityRunActionParamsSchema.parse({
          body: '{"data": "test"}',
        })
      ).not.toThrow();
    });

    it('validates with only severity', () => {
      expect(() =>
        D3SecurityRunActionParamsSchema.parse({
          severity: 'critical',
        })
      ).not.toThrow();
    });
  });

  describe('D3SecurityRunActionResponseSchema', () => {
    it('validates valid response', () => {
      expect(() =>
        D3SecurityRunActionResponseSchema.parse({
          refid: 'ref-123',
        })
      ).not.toThrow();
    });

    it('throws when refid is missing', () => {
      expect(() => D3SecurityRunActionResponseSchema.parse({})).toThrow();
    });
  });
});
