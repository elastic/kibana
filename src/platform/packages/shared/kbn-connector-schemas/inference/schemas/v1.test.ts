/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ConfigSchema,
  SecretsSchema,
  ChatCompleteParamsSchema,
  UnifiedChatCompleteParamsSchema,
  RerankParamsSchema,
  SparseEmbeddingParamsSchema,
  TextEmbeddingParamsSchema,
  DashboardActionParamsSchema,
} from './v1';

describe('Inference Schema', () => {
  describe('ConfigSchema', () => {
    const validConfig = {
      provider: 'openai',
      taskType: 'completion',
      inferenceId: 'inference-123',
    };

    it('validates a valid config', () => {
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('applies default values for optional fields', () => {
      const result = ConfigSchema.parse(validConfig);
      expect(result.providerConfig).toEqual({});
      expect(result.taskTypeConfig).toEqual({});
    });

    it('validates with all fields', () => {
      expect(() =>
        ConfigSchema.parse({
          ...validConfig,
          providerConfig: { model: 'gpt-4' },
          taskTypeConfig: { max_tokens: 1000 },
          contextWindowLength: 100000,
          headers: { 'X-Custom-Header': 'value' },
          temperature: 0.7,
        })
      ).not.toThrow();
    });

    it('throws when provider is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          taskType: 'completion',
          inferenceId: 'inference-123',
        })
      ).toThrow();
    });

    it('throws when taskType is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          provider: 'openai',
          inferenceId: 'inference-123',
        })
      ).toThrow();
    });

    it('throws when inferenceId is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          provider: 'openai',
          taskType: 'completion',
        })
      ).toThrow();
    });

    it('coerces numeric values', () => {
      const result = ConfigSchema.parse({
        ...validConfig,
        contextWindowLength: '100000',
        temperature: '0.7',
      });
      expect(result.contextWindowLength).toBe(100000);
      expect(result.temperature).toBe(0.7);
    });
  });

  describe('SecretsSchema', () => {
    it('validates with default empty providerSecrets', () => {
      const result = SecretsSchema.parse({});
      expect(result.providerSecrets).toEqual({});
    });

    it('validates with providerSecrets', () => {
      expect(() =>
        SecretsSchema.parse({
          providerSecrets: { apiKey: 'secret-key' },
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ChatCompleteParamsSchema', () => {
    it('validates with input', () => {
      expect(() =>
        ChatCompleteParamsSchema.parse({
          input: 'Hello, how are you?',
        })
      ).not.toThrow();
    });

    it('throws when input is missing', () => {
      expect(() => ChatCompleteParamsSchema.parse({})).toThrow();
    });
  });

  describe('UnifiedChatCompleteParamsSchema', () => {
    it('validates with body containing messages', () => {
      expect(() =>
        UnifiedChatCompleteParamsSchema.parse({
          body: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
        })
      ).not.toThrow();
    });

    it('validates with all optional body fields', () => {
      expect(() =>
        UnifiedChatCompleteParamsSchema.parse({
          body: {
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'gpt-4',
            max_tokens: 1000,
            temperature: 0.7,
            stop: ['END'],
            n: 1,
            tools: [
              {
                type: 'function',
                function: { name: 'test', description: 'Test function' },
              },
            ],
            tool_choice: 'auto',
            top_p: 0.9,
            user: 'user-123',
          },
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('validates tool_choice as object', () => {
      expect(() =>
        UnifiedChatCompleteParamsSchema.parse({
          body: {
            messages: [],
            tool_choice: {
              type: 'function',
              function: { name: 'my_function' },
            },
          },
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() => UnifiedChatCompleteParamsSchema.parse({})).toThrow();
    });

    it('applies default empty messages array', () => {
      const result = UnifiedChatCompleteParamsSchema.parse({
        body: {},
      });
      expect(result.body.messages).toEqual([]);
    });

    it('coerces numeric values in body', () => {
      const result = UnifiedChatCompleteParamsSchema.parse({
        body: {
          messages: [],
          max_tokens: '1000',
          temperature: '0.7',
        },
      });
      expect(result.body.max_tokens).toBe(1000);
      expect(result.body.temperature).toBe(0.7);
    });
  });

  describe('RerankParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        RerankParamsSchema.parse({
          input: ['text1', 'text2'],
          query: 'search query',
        })
      ).not.toThrow();
    });

    it('applies default empty array for input', () => {
      const result = RerankParamsSchema.parse({
        query: 'search query',
      });
      expect(result.input).toEqual([]);
    });

    it('throws when query is missing', () => {
      expect(() =>
        RerankParamsSchema.parse({
          input: ['text1', 'text2'],
        })
      ).toThrow();
    });
  });

  describe('SparseEmbeddingParamsSchema', () => {
    it('validates with input', () => {
      expect(() =>
        SparseEmbeddingParamsSchema.parse({
          input: 'text to embed',
        })
      ).not.toThrow();
    });

    it('throws when input is missing', () => {
      expect(() => SparseEmbeddingParamsSchema.parse({})).toThrow();
    });
  });

  describe('TextEmbeddingParamsSchema', () => {
    it('validates with required fields', () => {
      expect(() =>
        TextEmbeddingParamsSchema.parse({
          input: 'text to embed',
          inputType: 'search_document',
        })
      ).not.toThrow();
    });

    it('throws when input is missing', () => {
      expect(() =>
        TextEmbeddingParamsSchema.parse({
          inputType: 'search_document',
        })
      ).toThrow();
    });

    it('throws when inputType is missing', () => {
      expect(() =>
        TextEmbeddingParamsSchema.parse({
          input: 'text',
        })
      ).toThrow();
    });
  });

  describe('DashboardActionParamsSchema', () => {
    it('validates with dashboardId', () => {
      expect(() =>
        DashboardActionParamsSchema.parse({
          dashboardId: 'dashboard-123',
        })
      ).not.toThrow();
    });

    it('throws when dashboardId is missing', () => {
      expect(() => DashboardActionParamsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        DashboardActionParamsSchema.parse({
          dashboardId: 'dashboard-123',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });
});
