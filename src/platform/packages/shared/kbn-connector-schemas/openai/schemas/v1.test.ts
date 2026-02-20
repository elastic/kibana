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
  InvokeAIActionParamsSchema,
  StreamActionParamsSchema,
  DashboardActionParamsSchema,
} from './v1';

describe('OpenAI Schema', () => {
  describe('ConfigSchema', () => {
    it('validates Azure AI config', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'Azure OpenAI',
          apiUrl: 'https://my-resource.openai.azure.com',
        })
      ).not.toThrow();
    });

    it('validates OpenAI config', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'OpenAI',
          apiUrl: 'https://api.openai.com',
        })
      ).not.toThrow();
    });

    it('validates OpenAI config with optional fields', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'OpenAI',
          apiUrl: 'https://api.openai.com',
          organizationId: 'org-123',
          projectId: 'proj-456',
          defaultModel: 'gpt-4',
          headers: { 'X-Custom': 'value' },
          contextWindowLength: 128000,
          temperature: 0.7,
        })
      ).not.toThrow();
    });

    it('validates Other provider config', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'Other',
          apiUrl: 'https://custom-api.example.com',
          defaultModel: 'custom-model',
        })
      ).not.toThrow();
    });

    it('validates Other provider with verificationMode', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'Other',
          apiUrl: 'https://custom-api.example.com',
          defaultModel: 'custom-model',
          verificationMode: 'none',
          enableNativeFunctionCalling: true,
        })
      ).not.toThrow();
    });

    it('throws on invalid apiProvider', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'InvalidProvider',
          apiUrl: 'https://api.example.com',
        })
      ).toThrow();
    });

    it('throws when apiUrl is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          apiProvider: 'OpenAI',
        })
      ).toThrow();
    });

    it('coerces numeric values', () => {
      const result = ConfigSchema.parse({
        apiProvider: 'OpenAI',
        apiUrl: 'https://api.openai.com',
        contextWindowLength: '128000',
        temperature: '0.7',
      });
      expect(result.contextWindowLength).toBe(128000);
      expect(result.temperature).toBe(0.7);
    });
  });

  describe('SecretsSchema', () => {
    it('validates with apiKey only', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'sk-test123',
        })
      ).not.toThrow();
    });

    it('validates with certificate data', () => {
      expect(() =>
        SecretsSchema.parse({
          certificateData: 'cert-data',
          privateKeyData: 'key-data',
          caData: 'ca-data',
        })
      ).not.toThrow();
    });

    it('validates with optional apiKey and cert data', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: 'sk-test',
          certificateData: 'cert',
        })
      ).not.toThrow();
    });

    it('does not throw on empty apiKey for first variant', () => {
      expect(() =>
        SecretsSchema.parse({
          apiKey: '',
        })
      ).not.toThrow();
    });
  });

  describe('RunActionParamsSchema', () => {
    it('validates with required body', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: '{"model": "gpt-4", "messages": []}',
        })
      ).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: '{"messages": []}',
          timeout: 30000,
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() => RunActionParamsSchema.parse({})).toThrow();
    });

    it('coerces timeout to number', () => {
      const result = RunActionParamsSchema.parse({
        body: '{}',
        timeout: '30000',
      });
      expect(result.timeout).toBe(30000);
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

    it('validates with tools', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [{ role: 'user', content: 'Hello' }],
          tools: [
            {
              type: 'function',
              function: {
                name: 'get_weather',
                description: 'Get weather',
                parameters: { type: 'object' },
              },
            },
          ],
        })
      ).not.toThrow();
    });

    it('validates tool_choice values', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          tool_choice: 'none',
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          tool_choice: 'auto',
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          tool_choice: 'required',
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          tool_choice: {
            type: 'function',
            function: { name: 'my_function' },
          },
        })
      ).not.toThrow();
    });

    it('validates message with function_call', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [
            {
              role: 'assistant',
              content: '',
              function_call: {
                name: 'get_weather',
                arguments: '{"location": "NYC"}',
              },
            },
          ],
        })
      ).not.toThrow();
    });

    it('validates message with tool_calls', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [
            {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{}',
                  },
                },
              ],
            },
          ],
        })
      ).not.toThrow();
    });

    it('validates stop as string or array', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          stop: 'END',
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          stop: ['END', 'STOP'],
        })
      ).not.toThrow();
    });

    it('throws when messages is missing', () => {
      expect(() => InvokeAIActionParamsSchema.parse({})).toThrow();
    });

    it('coerces numeric values', () => {
      const result = InvokeAIActionParamsSchema.parse({
        messages: [],
        n: '3',
        temperature: '0.7',
        timeout: '30000',
      });
      expect(result.n).toBe(3);
      expect(result.temperature).toBe(0.7);
      expect(result.timeout).toBe(30000);
    });
  });

  describe('StreamActionParamsSchema', () => {
    it('validates with required body', () => {
      expect(() =>
        StreamActionParamsSchema.parse({
          body: '{"messages": []}',
        })
      ).not.toThrow();
    });

    it('applies default stream to false', () => {
      const result = StreamActionParamsSchema.parse({
        body: '{}',
      });
      expect(result.stream).toBe(false);
    });

    it('validates with all fields', () => {
      expect(() =>
        StreamActionParamsSchema.parse({
          body: '{}',
          stream: true,
          timeout: 30000,
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('throws when body is missing', () => {
      expect(() => StreamActionParamsSchema.parse({})).toThrow();
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
          dashboardId: 'test',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });
});
