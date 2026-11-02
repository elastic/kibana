/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('Server Log Schema', () => {
  describe('ConfigSchema', () => {
    it('validates empty object', () => {
      expect(() => ConfigSchema.parse({})).not.toThrow();
    });

    it('applies default empty object', () => {
      const result = ConfigSchema.parse({});
      expect(result).toEqual({});
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
    it('validates empty object', () => {
      expect(() => SecretsSchema.parse({})).not.toThrow();
    });

    it('applies default empty object', () => {
      const result = SecretsSchema.parse({});
      expect(result).toEqual({});
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with required message', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Test log message',
        })
      ).not.toThrow();
    });

    it('applies default level to info', () => {
      const result = ParamsSchema.parse({
        message: 'Test message',
      });
      expect(result.level).toBe('info');
    });

    it('validates all log levels', () => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      levels.forEach((level) => {
        expect(() =>
          ParamsSchema.parse({
            message: 'Test',
            level,
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid log level', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Test',
          level: 'invalid',
        })
      ).toThrow();
    });

    it('throws when message is missing', () => {
      expect(() => ParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Test',
          level: 'info',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates with explicit level', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Debug message',
          level: 'debug',
        })
      ).not.toThrow();
    });

    it('validates empty message', () => {
      expect(() =>
        ParamsSchema.parse({
          message: '',
        })
      ).not.toThrow();
    });
  });
});
