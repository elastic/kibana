/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';

describe('Slack Schema', () => {
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
          webhookUrl: 'https://example.com/slack-webhook',
        })
      ).not.toThrow();
    });

    it('throws when webhookUrl is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          webhookUrl: 'https://example.com/slack-webhook',
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
          message: 'Hello, Slack!',
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

    it('validates message with special characters', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Hello *bold* _italic_ ~strikethrough~',
        })
      ).not.toThrow();
    });

    it('validates message with emojis', () => {
      expect(() =>
        ParamsSchema.parse({
          message: 'Alert :warning: Something happened!',
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
