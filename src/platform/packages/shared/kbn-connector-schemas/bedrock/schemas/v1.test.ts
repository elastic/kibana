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
  RunActionParamsSchema,
  BedrockMessageSchema,
  BedrockToolChoiceSchema,
  InvokeAIActionParamsSchema,
  DashboardActionParamsSchema,
} from './v1';

describe('Bedrock Schema', () => {
  describe('ConfigSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://bedrock.us-east-1.amazonaws.com',
        })
      ).not.toThrow();
    });

    it('applies default model when not provided', () => {
      const result = ConfigSchema.parse({
        apiUrl: 'https://bedrock.us-east-1.amazonaws.com',
      });
      expect(result.defaultModel).toBeDefined();
    });

    it('accepts optional fields', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://bedrock.us-east-1.amazonaws.com',
          defaultModel: 'anthropic.claude-v2',
          contextWindowLength: 100000,
          temperature: 0.7,
        })
      ).not.toThrow();
    });

    it('throws when apiUrl is missing', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    it('coerces numeric strings for contextWindowLength', () => {
      const result = ConfigSchema.parse({
        apiUrl: 'https://bedrock.us-east-1.amazonaws.com',
        contextWindowLength: '100000',
      });
      expect(result.contextWindowLength).toBe(100000);
    });
  });

  describe('SecretsSchema', () => {
    it('validates valid secrets', () => {
      expect(() =>
        SecretsSchema.parse({
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        })
      ).not.toThrow();
    });

    it('throws when accessKey is missing', () => {
      expect(() =>
        SecretsSchema.parse({
          secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        })
      ).toThrow();
    });

    it('throws when secret is missing', () => {
      expect(() =>
        SecretsSchema.parse({
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
        })
      ).toThrow();
    });

    it('throws on empty object', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });
  });

  describe('RunActionParamsSchema', () => {
    it('validates with required body', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: '{"prompt": "Hello"}',
        })
      ).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: '{"prompt": "Hello"}',
          model: 'anthropic.claude-v2',
          timeout: 30000,
          raw: true,
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() => RunActionParamsSchema.parse({})).toThrow();
    });

    it('coerces timeout to number', () => {
      const result = RunActionParamsSchema.parse({
        body: '{"prompt": "Hello"}',
        timeout: '30000',
      });
      expect(result.timeout).toBe(30000);
    });
  });

  describe('BedrockMessageSchema', () => {
    it('validates message with content', () => {
      expect(() =>
        BedrockMessageSchema.parse({
          role: 'user',
          content: 'Hello',
        })
      ).not.toThrow();
    });

    it('validates message with rawContent', () => {
      expect(() =>
        BedrockMessageSchema.parse({
          role: 'assistant',
          rawContent: [{ type: 'text', text: 'Hello' }],
        })
      ).not.toThrow();
    });

    it('throws when neither content nor rawContent is provided', () => {
      expect(() =>
        BedrockMessageSchema.parse({
          role: 'user',
        })
      ).toThrow('Must specify either content or rawContent');
    });

    it('throws when both content and rawContent are provided', () => {
      expect(() =>
        BedrockMessageSchema.parse({
          role: 'user',
          content: 'Hello',
          rawContent: [{ type: 'text', text: 'Hello' }],
        })
      ).toThrow('content and rawContent can not be used at the same time');
    });

    it('throws when role is missing', () => {
      expect(() =>
        BedrockMessageSchema.parse({
          content: 'Hello',
        })
      ).toThrow();
    });
  });

  describe('BedrockToolChoiceSchema', () => {
    it('validates auto type', () => {
      expect(() =>
        BedrockToolChoiceSchema.parse({
          type: 'auto',
        })
      ).not.toThrow();
    });

    it('validates any type', () => {
      expect(() =>
        BedrockToolChoiceSchema.parse({
          type: 'any',
        })
      ).not.toThrow();
    });

    it('validates tool type with name', () => {
      expect(() =>
        BedrockToolChoiceSchema.parse({
          type: 'tool',
          name: 'myTool',
        })
      ).not.toThrow();
    });

    it('throws on invalid type', () => {
      expect(() =>
        BedrockToolChoiceSchema.parse({
          type: 'invalid',
        })
      ).toThrow();
    });
  });

  describe('InvokeAIActionParamsSchema', () => {
    it('validates with required messages', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'anthropic.claude-v2',
          temperature: 0.7,
          stopSequences: ['END'],
          system: 'You are a helpful assistant',
          maxTokens: 1000,
          timeout: 30000,
          anthropicVersion: 'bedrock-2023-05-31',
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object' },
            },
          ],
          toolChoice: { type: 'auto' },
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('throws when messages is missing', () => {
      expect(() => InvokeAIActionParamsSchema.parse({})).toThrow();
    });

    it('doest not throw when messages is empty array', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
        })
      ).not.toThrow();
    });

    it('throws when messages is undefined ', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: undefined,
        })
      ).toThrow();
    });

    it('coerces temperature to number', () => {
      const result = InvokeAIActionParamsSchema.parse({
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: '0.7',
      });
      expect(result.temperature).toBe(0.7);
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
