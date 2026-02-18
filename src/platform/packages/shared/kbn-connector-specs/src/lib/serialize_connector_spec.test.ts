/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import * as connectorsSpecs from '../all_specs';
import { serializeConnectorSpec } from './serialize_connector_spec';

describe('serializeConnectorSpec', () => {
  describe('basic structure', () => {
    it('returns object with metadata and schema properties', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test Connector',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('schema');
    });

    it('passes through metadata unchanged', () => {
      const spec = {
        metadata: {
          id: '.test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.metadata).toEqual(spec.metadata);
    });

    it('creates JSON Schema with config and secrets properties', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic'],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.schema).toHaveProperty('type', 'object');
      expect(result.schema).toHaveProperty('properties');
      const properties = result.schema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('config');
      expect(properties).toHaveProperty('secrets');
    });
  });

  describe('config schema handling', () => {
    it('creates empty config object when schema is undefined', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const config = properties.config as Record<string, unknown>;
      expect(config.type).toBe('object');
    });

    it('includes config schema when provided', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        schema: z.object({
          apiUrl: z.url(),
          timeout: z.number().optional(),
        }),
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const config = properties.config as Record<string, unknown>;
      const configProps = config.properties as Record<string, unknown>;

      expect(configProps).toHaveProperty('apiUrl');
      expect(configProps).toHaveProperty('timeout');
    });
  });

  describe('Secrets schema generation', () => {
    it('creates empty secrets object when no auth types provided', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as Record<string, unknown>;
      expect(secrets.type).toBe('object');
      expect(secrets.properties).toEqual({});
    });

    it('creates discriminated union for single auth type', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic'],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as Record<string, unknown>;

      expect(secrets.anyOf).toBeDefined();
      expect((secrets.anyOf as unknown[]).length).toBe(1);

      const options = secrets.anyOf as Array<{ properties?: Record<string, unknown> }>;
      expect(options[0].properties).toHaveProperty('authType');
    });

    it('creates discriminated union for multiple auth types', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic', 'bearer', 'api_key_header'],
        },
        actions: {
          test: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as Record<string, unknown> & {
        anyOf: Array<{ properties: unknown }>;
      };

      expect(secrets.anyOf).toBeDefined();
      expect(secrets.anyOf.length).toBe(3);

      const options = secrets.anyOf;
      options.forEach((option) => {
        expect(option.properties).toHaveProperty('authType');
      });
    });
  });

  describe('Meta information preservation', () => {
    it('preserves meta (label, sensitive, placeholder) in JSON Schema output', () => {
      const originalSchema = z.object({
        apiKey: z.string().meta({
          label: 'API Key',
          sensitive: true,
          placeholder: 'sk-...',
        }),
        url: z.string().meta({
          label: 'Server URL',
          helpText: 'The base URL of the API',
          placeholder: 'https://api.example.com',
        }),
        timeout: z.number().optional().meta({
          label: 'Timeout (seconds)',
          disabled: false,
        }),
      });

      const jsonSchema = z.toJSONSchema(originalSchema) as Record<string, unknown>;
      const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

      expect(properties.apiKey.label).toBe('API Key');
      expect(properties.apiKey.sensitive).toBe(true);
      expect(properties.apiKey.placeholder).toBe('sk-...');
      expect(properties.apiKey.type).toBe('string');

      expect(properties.url.label).toBe('Server URL');
      expect(properties.url.helpText).toBe('The base URL of the API');
      expect(properties.url.placeholder).toBe('https://api.example.com');

      expect(properties.timeout.label).toBe('Timeout (seconds)');
      expect(properties.timeout.disabled).toBe(false);
      expect(properties.timeout.type).toBe('number');
    });
  });

  describe('Real-world connectors', () => {
    it('successfully serializes AlienVault OTX connector', () => {
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);

      expect(serialized.metadata).toBeDefined();
      expect(serialized.schema).toBeDefined();
      expect(serialized.schema.type).toBe('object');
    });

    it('successfully serializes VirusTotal connector', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);

      expect(serialized.metadata).toBeDefined();
      expect(serialized.schema).toBeDefined();
      expect(serialized.schema.type).toBe('object');
    });

    it('successfully serializes all available connector specs', () => {
      const specNames = Object.keys(connectorsSpecs);
      expect(specNames.length).toBeGreaterThan(0);

      for (const specName of specNames) {
        const spec = connectorsSpecs[specName as keyof typeof connectorsSpecs];
        expect(() => serializeConnectorSpec(spec)).not.toThrow();
      }
    });
  });
});
