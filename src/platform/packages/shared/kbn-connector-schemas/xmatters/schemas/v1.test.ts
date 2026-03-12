/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('xMatters Schema', () => {
  describe('ConfigSchema', () => {
    it('validates empty object with defaults', () => {
      const result = ConfigSchema.parse({});
      expect(result.configUrl).toBeNull();
      expect(result.usesBasic).toBe(true);
    });

    it('validates with configUrl', () => {
      expect(() =>
        ConfigSchema.parse({
          configUrl: 'https://company.xmatters.com/api/xm/1/functions/xxx/triggers',
        })
      ).not.toThrow();
    });

    it('validates with usesBasic false', () => {
      expect(() =>
        ConfigSchema.parse({
          usesBasic: false,
        })
      ).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        ConfigSchema.parse({
          configUrl: 'https://company.xmatters.com/api/xm/1/functions/xxx/triggers',
          usesBasic: true,
        })
      ).not.toThrow();
    });

    it('accepts null for configUrl', () => {
      expect(() =>
        ConfigSchema.parse({
          configUrl: null,
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates empty object with defaults', () => {
      const result = SecretsSchema.parse({});
      expect(result.user).toBeNull();
      expect(result.password).toBeNull();
      expect(result.secretsUrl).toBeNull();
    });

    it('validates with basic auth', () => {
      expect(() =>
        SecretsSchema.parse({
          user: 'username',
          password: 'password',
        })
      ).not.toThrow();
    });

    it('validates with secretsUrl', () => {
      expect(() =>
        SecretsSchema.parse({
          secretsUrl: 'https://company.xmatters.com/api/xm/1/functions/xxx/triggers?apiKey=xxx',
        })
      ).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        SecretsSchema.parse({
          user: 'username',
          password: 'password',
          secretsUrl: 'https://company.xmatters.com/...',
        })
      ).not.toThrow();
    });

    it('accepts null values', () => {
      expect(() =>
        SecretsSchema.parse({
          user: null,
          password: null,
          secretsUrl: null,
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          user: 'test',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with required severity', () => {
      expect(() =>
        ParamsSchema.parse({
          severity: 'high',
        })
      ).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        ParamsSchema.parse({
          alertActionGroupName: 'Alert',
          signalId: 'signal-123',
          ruleName: 'Test Rule',
          date: '2023-01-01T00:00:00Z',
          severity: 'critical',
          spaceId: 'default',
          tags: 'tag1,tag2',
        })
      ).not.toThrow();
    });

    it('throws when severity is missing', () => {
      expect(() =>
        ParamsSchema.parse({
          alertActionGroupName: 'Alert',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          severity: 'high',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates with optional fields as undefined', () => {
      expect(() =>
        ParamsSchema.parse({
          severity: 'medium',
          alertActionGroupName: undefined,
          signalId: undefined,
        })
      ).not.toThrow();
    });

    it('accepts empty string for severity', () => {
      expect(() =>
        ParamsSchema.parse({
          severity: '',
        })
      ).not.toThrow();
    });
  });
});
