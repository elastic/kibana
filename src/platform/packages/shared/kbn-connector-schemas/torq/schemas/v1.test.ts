/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('Torq Schema', () => {
  describe('ConfigSchema', () => {
    it('validates with webhookIntegrationUrl', () => {
      expect(() =>
        ConfigSchema.parse({
          webhookIntegrationUrl: 'https://hooks.torq.io/v1/webhooks/xxx',
        })
      ).not.toThrow();
    });

    it('throws when webhookIntegrationUrl is missing', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          webhookIntegrationUrl: 'https://hooks.torq.io/v1/webhooks/xxx',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('accepts any string for webhookIntegrationUrl', () => {
      expect(() =>
        ConfigSchema.parse({
          webhookIntegrationUrl: 'any-string',
        })
      ).not.toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates with token', () => {
      expect(() =>
        SecretsSchema.parse({
          token: 'secret-token-123',
        })
      ).not.toThrow();
    });

    it('throws when token is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          token: 'token',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('accepts any string for token', () => {
      expect(() =>
        SecretsSchema.parse({
          token: 'any-string',
        })
      ).not.toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '{"event": "test"}',
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() => ParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '{}',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates with JSON body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: JSON.stringify({
            event: 'alert',
            severity: 'high',
            details: { key: 'value' },
          }),
        })
      ).not.toThrow();
    });

    it('accepts empty string for body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '',
        })
      ).not.toThrow();
    });

    it('validates with non-JSON body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: 'plain text body',
        })
      ).not.toThrow();
    });
  });
});
