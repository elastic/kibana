/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  TinesConfigSchema,
  TinesSecretsSchema,
  TinesStoriesActionParamsSchema,
  TinesStoryObjectSchema,
  TinesStoriesActionResponseSchema,
  TinesWebhooksActionParamsSchema,
  TinesWebhookObjectSchema,
  TinesRunActionParamsSchema,
  TinesRunActionResponseSchema,
} from './v1';

describe('Tines Schema', () => {
  describe('TinesConfigSchema', () => {
    it('validates with url', () => {
      expect(() =>
        TinesConfigSchema.parse({
          url: 'https://app.tines.io',
        })
      ).not.toThrow();
    });

    it('throws when url is missing', () => {
      expect(() => TinesConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TinesConfigSchema.parse({
          url: 'https://app.tines.io',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TinesSecretsSchema', () => {
    it('validates with email and token', () => {
      expect(() =>
        TinesSecretsSchema.parse({
          email: 'user@example.com',
          token: 'api-token-123',
        })
      ).not.toThrow();
    });

    it('throws when email is missing', () => {
      expect(() =>
        TinesSecretsSchema.parse({
          token: 'api-token-123',
        })
      ).toThrow();
    });

    it('throws when token is missing', () => {
      expect(() =>
        TinesSecretsSchema.parse({
          email: 'user@example.com',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TinesSecretsSchema.parse({
          email: 'user@example.com',
          token: 'token',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TinesStoriesActionParamsSchema', () => {
    it('is null', () => {
      expect(TinesStoriesActionParamsSchema).toBeNull();
    });
  });

  describe('TinesStoryObjectSchema', () => {
    it('validates a valid story', () => {
      expect(() =>
        TinesStoryObjectSchema.parse({
          id: 123,
          name: 'Test Story',
          published: true,
        })
      ).not.toThrow();
    });

    it('coerces id to number', () => {
      const result = TinesStoryObjectSchema.parse({
        id: '123',
        name: 'Test Story',
        published: true,
      });
      expect(result.id).toBe(123);
    });

    it('throws when required fields are missing', () => {
      expect(() =>
        TinesStoryObjectSchema.parse({
          id: 123,
          name: 'Test Story',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TinesStoryObjectSchema.parse({
          id: 123,
          name: 'Test Story',
          published: true,
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TinesStoriesActionResponseSchema', () => {
    it('validates a valid response', () => {
      expect(() =>
        TinesStoriesActionResponseSchema.parse({
          stories: [
            { id: 1, name: 'Story 1', published: true },
            { id: 2, name: 'Story 2', published: false },
          ],
          incompleteResponse: false,
        })
      ).not.toThrow();
    });

    it('validates with empty stories array', () => {
      expect(() =>
        TinesStoriesActionResponseSchema.parse({
          stories: [],
          incompleteResponse: false,
        })
      ).not.toThrow();
    });
  });

  describe('TinesWebhooksActionParamsSchema', () => {
    it('validates with storyId', () => {
      expect(() =>
        TinesWebhooksActionParamsSchema.parse({
          storyId: 123,
        })
      ).not.toThrow();
    });

    it('coerces storyId to number', () => {
      const result = TinesWebhooksActionParamsSchema.parse({
        storyId: '456',
      });
      expect(result.storyId).toBe(456);
    });

    it('throws when storyId is missing', () => {
      expect(() => TinesWebhooksActionParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TinesWebhooksActionParamsSchema.parse({
          storyId: 123,
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TinesWebhookObjectSchema', () => {
    it('validates a valid webhook', () => {
      expect(() =>
        TinesWebhookObjectSchema.parse({
          id: 456,
          name: 'Test Webhook',
          storyId: 123,
        })
      ).not.toThrow();
    });

    it('coerces id and storyId to numbers', () => {
      const result = TinesWebhookObjectSchema.parse({
        id: '456',
        name: 'Test Webhook',
        storyId: '123',
      });
      expect(result.id).toBe(456);
      expect(result.storyId).toBe(123);
    });

    it('throws when required fields are missing', () => {
      expect(() =>
        TinesWebhookObjectSchema.parse({
          id: 456,
          name: 'Test Webhook',
        })
      ).toThrow();
    });
  });

  describe('TinesRunActionParamsSchema', () => {
    it('validates with body', () => {
      expect(() =>
        TinesRunActionParamsSchema.parse({
          body: '{"data": "test"}',
        })
      ).not.toThrow();
    });

    it('validates with webhook object', () => {
      expect(() =>
        TinesRunActionParamsSchema.parse({
          webhook: {
            id: 456,
            name: 'Test Webhook',
            storyId: 123,
          },
          body: '{"data": "test"}',
        })
      ).not.toThrow();
    });

    it('validates with webhookUrl', () => {
      expect(() =>
        TinesRunActionParamsSchema.parse({
          webhookUrl: 'https://app.tines.io/webhook/xxx',
          body: '{"data": "test"}',
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() =>
        TinesRunActionParamsSchema.parse({
          webhookUrl: 'https://app.tines.io/webhook/xxx',
        })
      ).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TinesRunActionParamsSchema.parse({
          body: '{}',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('TinesRunActionResponseSchema', () => {
    it('validates empty object', () => {
      expect(() => TinesRunActionResponseSchema.parse({})).not.toThrow();
    });
  });
});
