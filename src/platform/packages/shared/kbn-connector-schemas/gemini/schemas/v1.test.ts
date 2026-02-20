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
  DashboardActionParamsSchema,
  TelemetryMetadataSchema,
} from './v1';

describe('Gemini Schema', () => {
  describe('TelemetryMetadataSchema', () => {
    it('validates empty object', () => {
      expect(() => TelemetryMetadataSchema.parse({})).not.toThrow();
    });

    it('validates with all fields', () => {
      expect(() =>
        TelemetryMetadataSchema.parse({
          pluginId: 'test-plugin',
          aggregateBy: 'model',
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        TelemetryMetadataSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ConfigSchema', () => {
    const validConfig = {
      apiUrl: 'https://generativelanguage.googleapis.com',
      gcpRegion: 'us-central1',
      gcpProjectID: 'my-project',
    };

    it('validates a valid config', () => {
      expect(() => ConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('applies default model', () => {
      const result = ConfigSchema.parse(validConfig);
      expect(result.defaultModel).toBeDefined();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        ConfigSchema.parse({
          ...validConfig,
          defaultModel: 'gemini-pro',
          contextWindowLength: 100000,
          temperature: 0.7,
        })
      ).not.toThrow();
    });

    it('throws when apiUrl is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          gcpRegion: 'us-central1',
          gcpProjectID: 'my-project',
        })
      ).toThrow();
    });

    it('throws when gcpRegion is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://generativelanguage.googleapis.com',
          gcpProjectID: 'my-project',
        })
      ).toThrow();
    });

    it('throws when gcpProjectID is missing', () => {
      expect(() =>
        ConfigSchema.parse({
          apiUrl: 'https://generativelanguage.googleapis.com',
          gcpRegion: 'us-central1',
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
    it('validates valid secrets', () => {
      expect(() =>
        SecretsSchema.parse({
          credentialsJson: '{"type":"service_account"}',
        })
      ).not.toThrow();
    });

    it('throws when credentialsJson is missing', () => {
      expect(() => SecretsSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          credentialsJson: '{}',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('RunActionParamsSchema', () => {
    it('validates with required body', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: { contents: [{ parts: [{ text: 'Hello' }] }] },
        })
      ).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        RunActionParamsSchema.parse({
          body: { contents: [] },
          model: 'gemini-pro',
          timeout: 30000,
          temperature: 0.7,
          stopSequences: ['END'],
          raw: true,
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('accepts empty object since body is z.any()', () => {
      expect(() => RunActionParamsSchema.parse({})).not.toThrow();
    });

    it('coerces timeout to number', () => {
      const result = RunActionParamsSchema.parse({
        body: {},
        timeout: '30000',
      });
      expect(result.timeout).toBe(30000);
    });
  });

  describe('InvokeAIActionParamsSchema', () => {
    it('validates with required messages', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        })
      ).not.toThrow();
    });

    it('validates with all optional fields', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          maxOutputTokens: 1000,
          systemInstruction: 'You are a helpful assistant',
          model: 'gemini-pro',
          temperature: 0.7,
          stopSequences: ['END'],
          timeout: 30000,
          tools: [{ functionDeclarations: [] }],
          toolConfig: { mode: 'AUTO' },
          telemetryMetadata: { pluginId: 'test' },
        })
      ).not.toThrow();
    });

    it('validates toolConfig modes', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          toolConfig: { mode: 'AUTO' },
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          toolConfig: { mode: 'ANY' },
        })
      ).not.toThrow();

      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          toolConfig: { mode: 'NONE' },
        })
      ).not.toThrow();
    });

    it('throws on invalid toolConfig mode', () => {
      expect(() =>
        InvokeAIActionParamsSchema.parse({
          messages: [],
          toolConfig: { mode: 'INVALID' },
        })
      ).toThrow();
    });

    it('accepts empty object since messages is z.any()', () => {
      expect(() => InvokeAIActionParamsSchema.parse({})).not.toThrow();
    });

    it('coerces numeric values', () => {
      const result = InvokeAIActionParamsSchema.parse({
        messages: [],
        maxOutputTokens: '1000',
        temperature: '0.7',
      });
      expect(result.maxOutputTokens).toBe(1000);
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
