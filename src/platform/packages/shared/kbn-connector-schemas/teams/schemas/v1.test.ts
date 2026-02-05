/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('Teams Schema', () => {
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
    it('validates with webhookUrl', () => {
      expect(() =>
        SecretsSchema.parse({
          webhookUrl: 'https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        })
      ).not.toThrow();
    });

    it('throws when webhookUrl is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          webhookUrl: 'https://outlook.office.com/webhook/...',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('accepts any string for webhookUrl', () => {
      expect(() =>
        SecretsSchema.parse({
          webhookUrl: 'any-string',
        })
      ).not.toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with required message', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Hello, Teams!',
        })
      ).not.toThrow();
    });

    it('throws when message is missing', () => {
      expect(() => ParamsSchema.parse({})).toThrow();
    });

    it('throws when message is empty', () => {
      expect(() =>
        ParamsSchema.parse({
          message: '',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Test',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates message with markdown', () => {
      expect(() =>
        ParamsSchema.parse({
          message: '**Bold** _Italic_ [Link](https://example.com)',
        })
      ).not.toThrow();
    });

    it('validates long message', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'a'.repeat(10000),
        })
      ).not.toThrow();
    });
  });
});
